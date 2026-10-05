import test from 'node:test';
import assert from 'node:assert/strict';
import process from 'node:process';
import handler from '../api/generate-prevention-suggestion.js';

function createResponse() {
  return {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(value) {
      this.body = value;
      return this;
    },
  };
}

function createAuthenticatedFetch(t, {
  geminiResponse = {
    candidates: [{ content: { parts: [{ text: 'Consider a restorative conversation and supportive check-ins.' }] } }],
  },
  geminiHttpResponse = null,
  profile = {
    role: { stringValue: 'counselor' },
    school_scope: { stringValue: 'elementary' },
  },
} = {}) {
  const calls = [];
  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
    delete process.env.FIREBASE_WEB_API_KEY;
    delete process.env.FIREBASE_PROJECT_ID;
    delete process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_MODEL;
  });
  process.env.FIREBASE_WEB_API_KEY = 'test-firebase-key';
  process.env.FIREBASE_PROJECT_ID = 'test-project';
  process.env.GEMINI_API_KEY = 'test-gemini-key';
  globalThis.fetch = async (url, options = {}) => {
    calls.push({ url: String(url), options });
    if (String(url).includes('identitytoolkit.googleapis.com')) {
      return {
        ok: true,
        async json() {
          return { users: [{ localId: 'counselor-uid', email: 'guidance.elem@ows.edu.ph' }] };
        },
      };
    }
    if (String(url).includes('firestore.googleapis.com')) {
      return {
        ok: true,
        async json() {
          return {
            fields: profile,
          };
        },
      };
    }
    if (geminiHttpResponse) return geminiHttpResponse;
    return {
      ok: true,
      async json() {
        return geminiResponse;
      },
    };
  };
  return calls;
}

test('AI endpoint rejects requests without a Firebase sign-in token', async (t) => {
  createAuthenticatedFetch(t);
  const response = createResponse();

  await handler({ method: 'POST', headers: {}, body: { incidentDescription: 'Generic narrative.' } }, response);

  assert.equal(response.statusCode, 401);
  assert.equal(response.body.suggestion, undefined);
});

test('AI endpoint rejects sign-in tokens without a provisioned SARES role', async (t) => {
  createAuthenticatedFetch(t, {
    profile: {
      role: { stringValue: 'unprovisioned' },
      school_scope: { stringValue: 'all' },
    },
  });
  const response = createResponse();

  await handler({
    method: 'POST',
    headers: { authorization: 'Bearer valid-test-token' },
    body: { incidentDescription: 'A generic anonymized narrative.' },
  }, response);

  assert.equal(response.statusCode, 401);
});

test('AI endpoint sends only narrative and violation labels and returns prevention guidance', async (t) => {
  const calls = createAuthenticatedFetch(t);
  const response = createResponse();

  await handler({
    method: 'POST',
    headers: { authorization: 'Bearer valid-test-token' },
    body: {
      incidentDescription: 'A disagreement occurred during group work.',
      offenseCategory: 'Respect',
      offenseType: 'Disruption',
      studentName: 'Must not be sent',
      reporterContact: 'Must not be sent',
    },
  }, response);

  assert.equal(response.statusCode, 200);
  assert.equal(response.body.source, 'gemini');
  assert.match(response.body.suggestion, /restorative conversation/);
  const prompt = JSON.parse(calls.at(-1).options.body).contents[0].parts[0].text;
  assert.match(prompt, /A disagreement occurred during group work/);
  assert.match(prompt, /Respect/);
  assert.doesNotMatch(prompt, /Must not be sent/);
  assert.doesNotMatch(prompt, /recommended sanction|severity score/i);
});

test('AI endpoint rejects empty and oversized narratives before calling Gemini', async (t) => {
  const calls = createAuthenticatedFetch(t);
  const headers = { authorization: 'Bearer valid-test-token' };
  const emptyResponse = createResponse();
  await handler({ method: 'POST', headers, body: { incidentDescription: '   ' } }, emptyResponse);

  const longResponse = createResponse();
  await handler({ method: 'POST', headers, body: { incidentDescription: 'x'.repeat(3001) } }, longResponse);

  assert.equal(emptyResponse.statusCode, 400);
  assert.equal(longResponse.statusCode, 413);
  assert.equal(calls.filter(({ url }) => url.includes('generativelanguage.googleapis.com')).length, 0);
});

test('AI endpoint reports the Gemini rejection reason when generation fails', async (t) => {
  createAuthenticatedFetch(t, {
    geminiHttpResponse: {
      ok: false,
      status: 403,
      statusText: 'Forbidden',
      async json() {
        return { error: { message: 'API key not valid. Please pass a valid API key.' } };
      },
    },
  });
  const response = createResponse();

  await handler({
    method: 'POST',
    headers: { authorization: 'Bearer test-token' },
    body: { incidentDescription: 'A generic anonymized narrative.' },
  }, response);

  assert.equal(response.statusCode, 502);
  assert.match(response.body.error, /Gemini request failed \(403\)/);
  assert.match(response.body.error, /API key not valid/);
});
