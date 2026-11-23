import test from 'node:test';
import assert from 'node:assert/strict';
import {
  AiTimeoutError,
  fetchTextWithTimeout,
  groupStudentsByRecommendation,
  parseJsonText,
} from '../src/engine/aiRequest.js';

// A fetch that never answers until it is aborted, like a stalled AI service.
function hangingFetch(_url, { signal }) {
  return new Promise((_resolve, reject) => {
    signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
  });
}

test('fetchTextWithTimeout gives up with AiTimeoutError when the AI does not answer', async () => {
  const started = Date.now();
  await assert.rejects(
    fetchTextWithTimeout('/api/x', {}, 50, hangingFetch),
    (error) => error instanceof AiTimeoutError && /did not respond/.test(error.message),
  );
  assert.ok(Date.now() - started < 1000);
});

test('fetchTextWithTimeout returns status and body text when the AI answers in time', async () => {
  const quickFetch = async () => new Response('{"recommendation":"ok"}', { status: 200 });
  const result = await fetchTextWithTimeout('/api/x', {}, 1000, quickFetch);
  assert.equal(result.ok, true);
  assert.equal(result.status, 200);
  assert.deepEqual(parseJsonText(result.text), { recommendation: 'ok' });
});

test('fetchTextWithTimeout passes network errors through unchanged', async () => {
  const failingFetch = async () => { throw new TypeError('Failed to fetch'); };
  await assert.rejects(fetchTextWithTimeout('/api/x', {}, 1000, failingFetch), TypeError);
});

test('parseJsonText returns null for empty or invalid bodies', () => {
  assert.equal(parseJsonText(''), null);
  assert.equal(parseJsonText('<html>error</html>'), null);
});

test('groupStudentsByRecommendation gives students with different results their own group', () => {
  const groups = groupStudentsByRecommendation([
    { studentId: 'a', studentName: 'A', schoolScope: 'high_school', offenseNumber: 3, recommendedSanction: 'Suspension' },
    { studentId: 'b', studentName: 'B', schoolScope: 'high_school', offenseNumber: 1, recommendedSanction: 'Warning' },
    { studentId: 'c', studentName: 'C', schoolScope: 'high_school', offenseNumber: 1, recommendedSanction: 'Warning' },
  ]);
  assert.equal(groups.length, 2);
  assert.deepEqual(groups[0].students.map((s) => s.studentId), ['a']);
  assert.deepEqual(groups[1].students.map((s) => s.studentId), ['b', 'c']);
  assert.equal(groups[0].rec.offenseNumber, 3);
});

test('groupStudentsByRecommendation separates the same offense number at different school levels', () => {
  const groups = groupStudentsByRecommendation([
    { studentId: 'a', schoolScope: 'elementary', offenseNumber: 1, recommendedSanction: 'Warning' },
    { studentId: 'b', schoolScope: 'high_school', offenseNumber: 1, recommendedSanction: 'Warning' },
  ]);
  assert.equal(groups.length, 2);
});
