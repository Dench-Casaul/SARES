/**
 * handbookIndex.js — v2
 * Deterministic indexes over the new 4-tier generalizedHandbook.json.
 * Offense hierarchy: Minor > {Light, Less Serious} | Major > {Serious, Very Serious}
 */
import handbook from './generalizedHandbook.json';

// ─── Pre-built indexes ────────────────────────────────────────────────────────

/** All offense groups keyed by `${categoryId}-${subcategoryId}-${handbookNumber}` */
const groupIndex = {};
/** All individual offenses keyed by offense id */
const offenseIndex = {};

handbook.offenseGroups.forEach((group) => {
  const key = `${group.categoryId}-${group.subcategoryId}-${group.handbookNumber}`;
  groupIndex[key] = group;
  group.offenses.forEach((offense) => {
    offenseIndex[offense.id] = { ...offense, group };
  });
});

/** offenseType objects keyed by id ('minor' | 'major') */
const typeIndex = Object.fromEntries(
  handbook.offenseTypes.map((t) => [t.id, t])
);

// ─── Public API ───────────────────────────────────────────────────────────────

export const HANDBOOK_META = {
  source: handbook.source,
};

/**
 * Returns all offense types (minor / major) with their subcategory lists.
 */
export function listOffenseTypes() {
  return handbook.offenseTypes;
}

/**
 * Returns all offense groups filtered by categoryId and optionally subcategoryId.
 * @param {'minor'|'major'} categoryId
 * @param {'light'|'less_serious'|'serious'|'very_serious'} [subcategoryId]
 */
export function listOffenseGroups(categoryId, subcategoryId = null) {
  return handbook.offenseGroups.filter(
    (g) =>
      g.categoryId === categoryId &&
      (subcategoryId === null || g.subcategoryId === subcategoryId)
  );
}

/**
 * Returns all individual offenses within a specific group.
 * @param {'minor'|'major'} categoryId
 * @param {string} subcategoryId
 * @param {number} handbookNumber
 */
export function listOffensesByGroup(categoryId, subcategoryId, handbookNumber) {
  const key = `${categoryId}-${subcategoryId}-${handbookNumber}`;
  return groupIndex[key]?.offenses ?? [];
}

/**
 * Returns a single offense object by its id (e.g. "m-l-1-1").
 */
export function getOffenseById(offenseId) {
  return offenseIndex[offenseId] ?? null;
}

/**
 * Returns whether an offense id is flagged as involving illegal activity.
 */
export function isIllegalActivityOffense(offenseId) {
  return offenseIndex[offenseId]?.isIllegal === true;
}

/**
 * Returns the handbook sanction for a MINOR offense based on offense number.
 * @param {1|2|3} offenseNumber
 * @returns {{ label: string, sanction: string } | null}
 */
export function getMinorSanctionByOffenseNumber(offenseNumber) {
  const minor = typeIndex['minor'];
  if (!minor) return null;
  const clamped = Math.min(Math.max(offenseNumber, 1), 3);
  return minor.sanctionSchedule.find((s) => s.offenseNumber === clamped) ?? null;
}

/**
 * Returns the handbook sanction for a MAJOR offense based on admin severity score (1-10).
 * @param {number} score — integer 1 to 10
 * @returns {{ label: string, sanction: string } | null}
 */
export function getMajorSanctionByScore(score) {
  const major = typeIndex['major'];
  if (!major) return null;
  const clamped = Math.min(Math.max(score, 1), 10);
  return major.severitySanctionMap.find(
    (s) => clamped >= s.min && clamped <= s.max
  ) ?? null;
}

/**
 * Returns the full sanctionSchedule array for minor offenses.
 */
export function getMinorSanctionSchedule() {
  return typeIndex['minor']?.sanctionSchedule ?? [];
}

/**
 * Returns the full severitySanctionMap array for major offenses.
 */
export function getMajorSanctionMap() {
  return typeIndex['major']?.severitySanctionMap ?? [];
}

/**
 * Returns subcategories for a given offense type id.
 * @param {'minor'|'major'} offenseTypeId
 */
export function getSubcategories(offenseTypeId) {
  return typeIndex[offenseTypeId]?.subcategories ?? [];
}

export { handbook as handbookDiscipline };
