/**
 * Helpers for the optional AI requests on the Record Violation page.
 * The handbook rule engine never depends on these: when the AI is slow or
 * unavailable, the counselor continues without it.
 */

export const AI_REQUEST_TIMEOUT_MS = 15000;

export class AiTimeoutError extends Error {
  constructor(timeoutMs = AI_REQUEST_TIMEOUT_MS) {
    super(`The AI did not respond within ${Math.round(timeoutMs / 1000)} seconds.`);
    this.name = 'AiTimeoutError';
  }
}

/**
 * fetch() that gives up after `timeoutMs`, so a slow connection or an
 * overloaded AI service can never leave the page loading forever.
 * The timer covers reading the response body as well, so callers receive
 * the parsed text instead of the Response.
 *
 * @returns {Promise<{ ok: boolean, status: number, text: string }>}
 */
export async function fetchTextWithTimeout(url, options = {}, timeoutMs = AI_REQUEST_TIMEOUT_MS, fetchImpl = fetch) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(url, { ...options, signal: controller.signal });
    const text = await response.text();
    return { ok: response.ok, status: response.status, text };
  } catch (error) {
    if (controller.signal.aborted) throw new AiTimeoutError(timeoutMs);
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

/** Parses a JSON response body; returns null for an empty or invalid body. */
export function parseJsonText(text) {
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/**
 * Groups students whose rule-engine results are the same (same school level,
 * offense number and sanction). Students in one group get one shared AI
 * counselor recommendation; students with different results get their own.
 *
 * @param {Array<{ studentId, studentName, schoolScope, offenseNumber, recommendedSanction }>} studentRecs
 * @returns {Array<{ key: string, rec: object, students: Array<{ studentId, studentName }> }>}
 */
export function groupStudentsByRecommendation(studentRecs = []) {
  const groups = new Map();
  for (const rec of studentRecs) {
    const key = [rec.schoolScope || '', rec.offenseNumber ?? '', rec.recommendedSanction || ''].join('|');
    if (!groups.has(key)) groups.set(key, { key, rec, students: [] });
    groups.get(key).students.push({ studentId: rec.studentId, studentName: rec.studentName });
  }
  return [...groups.values()];
}
