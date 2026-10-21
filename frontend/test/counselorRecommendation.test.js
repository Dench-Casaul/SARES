import test from "node:test";
import assert from "node:assert/strict";
import process from "node:process";
import handler from "../api/generate-counselor-recommendation.js";

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

function setAuthenticatedFetch(t, geminiResponse = {
  candidates: [{ content: { parts: [{ text: "Draft: arrange a follow-up consistent with the handbook." }] } }],
}) {
  const calls = [];
  const originalFetch = globalThis.fetch;
  t.after(() => {
    globalThis.fetch = originalFetch;
    delete process.env.FIREBASE_WEB_API_KEY;
    delete process.env.FIREBASE_PROJECT_ID;
    delete process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_MODEL;
  });
  process.env.FIREBASE_WEB_API_KEY = "test-firebase-key";
  process.env.FIREBASE_PROJECT_ID = "test-project";
  process.env.GEMINI_API_KEY = "test-gemini-key";
  globalThis.fetch = async (url, options = {}) => {
    calls.push({ url: String(url), options });
    if (String(url).includes("identitytoolkit.googleapis.com")) {
      return {
        ok: true,
        async json() {
          return { users: [{ localId: "counselor-uid", email: "guidance.elem@ows.edu.ph" }] };
        },
      };
    }
    if (String(url).includes("firestore.googleapis.com")) {
      return {
        ok: true,
        async json() {
          return {
            fields: {
              role: { stringValue: "counselor" },
              school_scope: { stringValue: "elementary" },
            },
          };
        },
      };
    }
    return {
      ok: true,
      async json() {
        return geminiResponse;
      },
    };
  };
  return calls;
}

const authorizedRequest = {
  method: "POST",
  headers: { authorization: "Bearer signed-in-token" },
  body: {
    incidentDescription: "A disagreement occurred during group work.",
    offenseType: "Minor Offenses",
    subcategory: "Less Serious",
    offenseGroup: "Disruption of Class",
    specificViolation: "Disturbing classmates",
    applicablePolicyReference: "Handbook Number 7: Tardiness and Attendance Violations – Tardiness (Minor Offenses / Less Serious)",
    ruleBasedSanction: "Written warning communicated to the student and parent/guardian notice.",
    handlingPath: "sanction",
    handbookPolicy: JSON.stringify({
      countingNote: "Minor offenses are counted cumulatively.",
      sanctionSchedule: [{ label: "2nd Offense", sanction: "Written warning." }],
    }),
    studentName: "Must not be sent",
    reporterContact: "Must not be sent",
  },
};

test("counselor guidance endpoint uses supplied handbook policy and keeps the sanction authoritative", async (t) => {
  const calls = setAuthenticatedFetch(t);
  const response = createResponse();

  await handler(authorizedRequest, response);

  assert.equal(response.statusCode, 200);
  assert.equal(response.body.source, "gemini");
  assert.match(response.body.recommendation, /^Applicable Policy Reference:\nHandbook Number 7: Tardiness and Attendance Violations – Tardiness \(Minor Offenses \/ Less Serious\)\n\n/);
  assert.match(response.body.recommendation, /Draft:/);
  const geminiCall = calls.at(-1);
  const prompt = JSON.parse(geminiCall.options.body).contents[0].parts[0].text;
  assert.match(prompt, /Minor offenses are counted cumulatively/);
  assert.match(prompt, /Written warning communicated/);
  assert.match(prompt, /Configured applicable-policy reference/);
  assert.match(prompt, /Anonymized incident narrative/);
  assert.match(prompt, /must not be changed/);
  assert.doesNotMatch(prompt, /edit the recommendation/i);
  assert.doesNotMatch(prompt, /Must not be sent/);
});

test("counselor guidance endpoint requires a signed-in provisioned account", async (t) => {
  setAuthenticatedFetch(t);
  const response = createResponse();

  await handler({ ...authorizedRequest, headers: {} }, response);

  assert.equal(response.statusCode, 401);
});

test("counselor guidance endpoint can use handbook context when narrative is blank", async (t) => {
  const calls = setAuthenticatedFetch(t);
  const blankNarrative = createResponse();
  await handler({
    ...authorizedRequest,
    body: { ...authorizedRequest.body, incidentDescription: " " },
  }, blankNarrative);

  const noPolicy = createResponse();
  await handler({
    ...authorizedRequest,
    body: { ...authorizedRequest.body, handbookPolicy: "" },
  }, noPolicy);

  assert.equal(blankNarrative.statusCode, 200);
  assert.equal(noPolicy.statusCode, 400);
  const prompt = JSON.parse(calls.findLast(({ url }) => url.includes("generativelanguage.googleapis.com")).options.body)
    .contents[0].parts[0].text;
  assert.match(prompt, /Not provided\. Do not infer incident-specific circumstances/);
  assert.equal(calls.filter(({ url }) => url.includes("generativelanguage.googleapis.com")).length, 1);
});
