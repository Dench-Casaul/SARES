/**
 * Offense recommendation helpers (server side).
 *
 * The model may only choose offenses from the handbook catalog the client sends.
 * Every id it returns is checked against that catalog, so it cannot invent an
 * offense, and the rule engine (not the model) still decides the sanction.
 */

export const MAX_CATALOG_ENTRIES = 400;
export const MAX_MATCHES = 3;
export const CONFIDENCE_LEVELS = Object.freeze(["high", "medium", "low"]);

const LEVEL_LABELS = Object.freeze({
  light: "Light",
  less_serious: "Less Serious",
  serious: "Serious",
  very_serious: "Very Serious",
});

function cleanText(value, maxLength) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, maxLength) : "";
}

/** Keeps only well-formed catalog entries with unique ids; returns null when the catalog is unusable. */
export function normalizeCatalog(rawCatalog) {
  if (!Array.isArray(rawCatalog) || rawCatalog.length === 0 || rawCatalog.length > MAX_CATALOG_ENTRIES) {
    return null;
  }

  const seen = new Set();
  const entries = [];
  for (const raw of rawCatalog) {
    const id = cleanText(raw?.id, 120);
    const title = cleanText(raw?.title, 240);
    const categoryId = cleanText(raw?.categoryId, 20);
    const subcategoryId = cleanText(raw?.subcategoryId, 40);
    if (!id || !title || seen.has(id)) continue;
    if (!["minor", "major"].includes(categoryId) || !LEVEL_LABELS[subcategoryId]) continue;
    seen.add(id);
    entries.push({ id, title, categoryId, subcategoryId, groupTitle: cleanText(raw?.groupTitle, 160) });
  }
  return entries.length > 0 ? entries : null;
}

/** One line per offense: `id | Major > Serious | Group | Offense`. */
export function formatCatalogForPrompt(entries) {
  return entries.map((entry) => [
    entry.id,
    `${entry.categoryId === "major" ? "Major" : "Minor"} > ${LEVEL_LABELS[entry.subcategoryId]}`,
    entry.groupTitle || "General",
    entry.title,
  ].join(" | ")).join("\n");
}

/** Gemini structured-output schema for the response. */
export const RESPONSE_SCHEMA = Object.freeze({
  type: "OBJECT",
  properties: {
    matches: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          offenseId: { type: "STRING" },
          confidence: { type: "STRING", enum: [...CONFIDENCE_LEVELS] },
          reason: { type: "STRING" },
        },
        required: ["offenseId", "confidence", "reason"],
      },
    },
  },
  required: ["matches"],
});

/**
 * Parses the model's JSON reply into at most MAX_MATCHES valid matches, in the
 * model's order. Unknown ids, duplicates and malformed items are dropped.
 * Returns null when the reply is not parseable JSON at all.
 */
export function parseOffenseMatches(rawText, validIds) {
  const text = String(rawText || "").trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    return null;
  }

  const items = Array.isArray(parsed?.matches) ? parsed.matches : [];
  const allowed = validIds instanceof Set ? validIds : new Set(validIds);
  const seen = new Set();
  const matches = [];
  for (const item of items) {
    const offenseId = cleanText(item?.offenseId, 120);
    if (!allowed.has(offenseId) || seen.has(offenseId)) continue;
    seen.add(offenseId);
    const confidence = CONFIDENCE_LEVELS.includes(item?.confidence) ? item.confidence : "low";
    matches.push({ offenseId, confidence, reason: cleanText(item?.reason, 300) });
    if (matches.length === MAX_MATCHES) break;
  }
  return matches;
}
