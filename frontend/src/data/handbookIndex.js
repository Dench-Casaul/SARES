/**
 * Deterministic indexes over generalizedHandbook.json (handbook text only).
 * Use for explainable lookups in the rule engine — no inference beyond JSON fields.
 */
import handbook from './generalizedHandbook.json';

const byNumber = Object.fromEntries(
  handbook.offenses.map((o) => [o.handbookNumber, o])
);

const byCategory = handbook.offenseCategories.reduce((acc, c) => {
  acc[c.id] = handbook.offenses.filter((o) => o.categoryId === c.id && !o.isMetaRule);
  return acc;
}, {});

/** @typedef {'major'|'minor'} HandbookCategoryId */

export const HANDBOOK_META = {
  sourceNote: handbook.source,
  sections: handbook.sections,
};

export function getHandbookOffense(handbookNumber) {
  return byNumber[handbookNumber] ?? null;
}

export function listOffensesByCategory(categoryId) {
  return byCategory[categoryId] ? [...byCategory[categoryId]] : [];
}

export function listSanctionForms() {
  return [...handbook.sanctionForms];
}

/**
 * @param {HandbookCategoryId} categoryId
 * @param {1|2|3} tierOrdinal — First/Second/Third offense step in Section IV for that track
 */
export function getScheduleTier(categoryId, tierOrdinal) {
  const block =
    categoryId === 'major'
      ? handbook.sanctionSchedule.majorOffenses
      : handbook.sanctionSchedule.minorOffenses;
  return block.tiers.find((t) => t.ordinal === tierOrdinal) ?? null;
}

export function getSanctionScheduleBlock(categoryId) {
  return categoryId === 'major'
    ? handbook.sanctionSchedule.majorOffenses
    : handbook.sanctionSchedule.minorOffenses;
}

export function getRepeatEscalationPatterns() {
  return [...handbook.repeatAndEscalationPatterns];
}

export { handbook as handbookDiscipline };
