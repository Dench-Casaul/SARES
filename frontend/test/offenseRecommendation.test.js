import test from 'node:test';
import assert from 'node:assert/strict';
import process from 'node:process';
import handler from '../api/recommend-offense.js';
import {
  normalizeCatalog,
  parseOffenseMatches,
} from '../api/_lib/offenseRecommendation.js';
import {
  OFFENSE_SELECTION_METHOD,
  buildOffenseCatalog,
  describeOffenseSelection,
  getOffenseSelectionMethod,
  redactStudentNames,
} from '../src/engine/offenseRecommendation.js';
import { getHandbook } from '../src/data/handbookIndex.js';

const catalog = buildOffenseCatalog(getHandbook());

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

function mockServices(t, geminiText) {
  const calls = [];
  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
    delete process.env.FIREBASE_WEB_API_KEY;
    delete process.env.FIREBASE_PROJECT_ID;
    delete process.env.GEMINI_API_KEY;
  });
  process.env.FIREBASE_WEB_API_KEY = 'test-firebase-key';
  process.env.FIREBASE_PROJECT_ID = 'test-project';
  process.env.GEMINI_API_KEY = 'test-gemini-key';
  globalThis.fetch = async (url, options = {}) => {
    calls.push({ url: String(url), options });
    if (String(url).includes('identitytoolkit.googleapis.com')) {
      return { ok: true, async json() { return { users: [{ localId: 'uid', email: 'guidance@ows.edu.ph' }] }; } };
    }
    if (String(url).includes('firestore.googleapis.com')) {
      return {
        ok: true,
        async json() {
          return { fields: { role: { stringValue: 'counselor' }, school_scope: { stringValue: 'high_school' } } };
        },
      };
    }
    return {
      ok: true,
      async json() { return { candidates: [{ content: { parts: [{ text: geminiText }] } }] }; },
    };
  };
  return calls;
}

const authorizedRequest = (body) => ({
  method: 'POST',
  headers: { authorization: 'Bearer token' },
  body,
});

test('the offense catalog covers every handbook offense with its classification', () => {
  const handbook = getHandbook();
  const total = handbook.offenseGroups.reduce((sum, group) => sum + group.offenses.length, 0);
  assert.equal(catalog.length, total);
  for (const entry of catalog) {
    assert.ok(entry.id && entry.title && entry.groupTitle);
    assert.ok(['minor', 'major'].includes(entry.categoryId));
  }
  assert.ok(normalizeCatalog(catalog), 'the real catalog passes server validation');
});

test('parseOffenseMatches keeps only catalog offenses, in order, without duplicates, at most three', () => {
  const ids = new Set(['a', 'b', 'c', 'd']);
  const matches = parseOffenseMatches(JSON.stringify({
    matches: [
      { offenseId: 'b', confidence: 'high', reason: 'Pushed a classmate.' },
      { offenseId: 'invented-offense', confidence: 'high', reason: 'Not in the handbook.' },
      { offenseId: 'b', confidence: 'low', reason: 'Duplicate.' },
      { offenseId: 'a', confidence: 'certain', reason: 'Unknown confidence becomes low.' },
      { offenseId: 'c', confidence: 'medium', reason: '' },
      { offenseId: 'd', confidence: 'low', reason: 'Fourth valid match is dropped.' },
    ],
  }), ids);

  assert.deepEqual(matches.map((match) => match.offenseId), ['b', 'a', 'c']);
  assert.equal(matches[1].confidence, 'low');
});

test('parseOffenseMatches accepts fenced JSON and rejects non-JSON replies', () => {
  const fenced = '```json\n{"matches":[{"offenseId":"a","confidence":"high","reason":"x"}]}\n```';
  assert.equal(parseOffenseMatches(fenced, ['a']).length, 1);
  assert.deepEqual(parseOffenseMatches('{"matches":[]}', ['a']), []);
  assert.equal(parseOffenseMatches('The best match is bullying.', ['a']), null);
});

test('normalizeCatalog rejects empty, oversized, or malformed catalogs', () => {
  assert.equal(normalizeCatalog([]), null);
  assert.equal(normalizeCatalog('not a list'), null);
  assert.equal(normalizeCatalog(Array.from({ length: 401 }, (_, i) => ({
    id: `x${i}`, title: 'T', categoryId: 'minor', subcategoryId: 'light',
  }))), null);
  assert.equal(normalizeCatalog([{ id: 'x', title: 'T', categoryId: 'severe', subcategoryId: 'light' }]), null);
});

test('recommend-offense returns only handbook offenses suggested by the model', async (t) => {
  const [first, second] = catalog;
  const calls = mockServices(t, JSON.stringify({
    matches: [
      { offenseId: second.id, confidence: 'high', reason: 'The narrative describes this act.' },
      { offenseId: 'made-up', confidence: 'high', reason: 'Invented.' },
      { offenseId: first.id, confidence: 'low', reason: 'Partly related.' },
    ],
  }));
  const res = createResponse();

  await handler(authorizedRequest({ incidentDescription: 'Student A pushed a classmate.', catalog }), res);

  assert.equal(res.statusCode, 200);
  assert.deepEqual(res.body.matches.map((match) => match.offenseId), [second.id, first.id]);
  const geminiCall = calls.find((call) => call.url.includes('generativelanguage.googleapis.com'));
  const sent = JSON.parse(geminiCall.options.body);
  assert.equal(sent.generationConfig.responseMimeType, 'application/json');
  assert.match(sent.contents[0].parts[0].text, new RegExp(second.id));
  assert.match(sent.contents[0].parts[0].text, /Student A pushed a classmate/);
});

test('recommend-offense validates input and authentication', async (t) => {
  mockServices(t, '{"matches":[]}');

  const missingNarrative = createResponse();
  await handler(authorizedRequest({ incidentDescription: '  ', catalog }), missingNarrative);
  assert.equal(missingNarrative.statusCode, 400);

  const missingCatalog = createResponse();
  await handler(authorizedRequest({ incidentDescription: 'Something happened.' }), missingCatalog);
  assert.equal(missingCatalog.statusCode, 400);

  const tooLong = createResponse();
  await handler(authorizedRequest({ incidentDescription: 'x'.repeat(3001), catalog }), tooLong);
  assert.equal(tooLong.statusCode, 413);

  const unauthenticated = createResponse();
  await handler({ method: 'POST', headers: {}, body: { incidentDescription: 'x', catalog } }, unauthenticated);
  assert.equal(unauthenticated.statusCode, 401);
});

test('recommend-offense reports an unreadable model reply as a failure', async (t) => {
  mockServices(t, 'I think it is bullying.');
  const res = createResponse();
  await handler(authorizedRequest({ incidentDescription: 'Something happened.', catalog }), res);
  assert.equal(res.statusCode, 502);
});

test('redactStudentNames replaces selected students\' names before the narrative goes to AI', () => {
  const students = [
    { full_name: 'Juan Dela Cruz', first_name: 'Juan', last_name: 'Dela Cruz' },
    { full_name: 'María Santos', first_name: 'María', last_name: 'Santos' },
  ];
  const text = 'Juan Dela Cruz pushed María during recess. Later juan apologized to Santos. Juanito was not involved.';

  assert.equal(
    redactStudentNames(text, students),
    'Student A pushed Student B during recess. Later Student A apologized to Student B. Juanito was not involved.'
  );
});

test('redactStudentNames ignores very short name parts and handles no students', () => {
  assert.equal(redactStudentNames('Al and Bo went to class.', [{ first_name: 'Al', last_name: 'Bo' }]), 'Al and Bo went to class.');
  assert.equal(redactStudentNames('Nothing to change.', []), 'Nothing to change.');
});

test('offense selection method records whether the counselor used the AI suggestion', () => {
  const suggestions = [{ offenseId: 'a' }, { offenseId: 'b' }];
  assert.equal(getOffenseSelectionMethod(suggestions, 'a'), OFFENSE_SELECTION_METHOD.AI_TOP_MATCH);
  assert.equal(getOffenseSelectionMethod(suggestions, 'b'), OFFENSE_SELECTION_METHOD.AI_OTHER_MATCH);
  assert.equal(getOffenseSelectionMethod(suggestions, 'z'), OFFENSE_SELECTION_METHOD.MANUAL);
  assert.equal(getOffenseSelectionMethod([], 'a'), OFFENSE_SELECTION_METHOD.MANUAL);

  assert.match(describeOffenseSelection(OFFENSE_SELECTION_METHOD.AI_TOP_MATCH), /top match/);
  assert.match(describeOffenseSelection(OFFENSE_SELECTION_METHOD.MANUAL, 'gemini'), /suggestions were not used/);
  assert.equal(describeOffenseSelection(OFFENSE_SELECTION_METHOD.MANUAL, 'unavailable'), 'Selected manually by the counselor.');
});
