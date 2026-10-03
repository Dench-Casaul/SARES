/**
 * handbookIndex.js — v2
 * Deterministic indexes over the new 4-tier generalizedHandbook.json.
 * Offense hierarchy: Minor > {Light, Less Serious} | Major > {Serious, Very Serious}
 */
import handbook from './generalizedHandbook.json' with { type: 'json' };

const baseHandbook = structuredClone(handbook);
let runtimeHandbook = structuredClone(baseHandbook);

/** All offense groups keyed by `${categoryId}-${subcategoryId}-${handbookNumber}` */
let groupIndex = {};
/** All individual offenses keyed by offense id */
let offenseIndex = {};

function rebuildIndexes() {
  groupIndex = {};
  offenseIndex = {};

  (runtimeHandbook.offenseGroups || []).forEach((group) => {
    const key = `${group.categoryId}-${group.subcategoryId}-${group.handbookNumber}`;
    groupIndex[key] = group;
    (group.offenses || []).forEach((offense) => {
      offenseIndex[offense.id] = { ...offense, group };
    });
  });
}

rebuildIndexes();

export function getSanctionOverrides() {
  return {
    minorSanctionSchedule: runtimeHandbook.offenseTypes?.find((type) => type.id === 'minor')?.sanctionSchedule?.map((rule) => ({ ...rule })) ?? [],
    majorSeveritySanctionMap: runtimeHandbook.offenseTypes?.find((type) => type.id === 'major')?.severitySanctionMap?.map((rule) => ({ ...rule })) ?? [],
  };
}

export function getHandbook() {
  return structuredClone(runtimeHandbook);
}

export function applySanctionOverrides(overrides = {}) {
  const minorRuleSource = runtimeHandbook.offenseTypes?.find((type) => type.id === 'minor')?.sanctionSchedule ?? [];
  const majorRuleSource = runtimeHandbook.offenseTypes?.find((type) => type.id === 'major')?.severitySanctionMap ?? [];

  const minorSchedule = (minorRuleSource || []).map((rule, index) => ({
    ...rule,
    ...(overrides.minorSanctionSchedule?.[index] || {}),
    offenseNumber: rule.offenseNumber,
  }));

  const majorSchedule = (majorRuleSource || []).map((rule, index) => ({
    ...rule,
    ...(overrides.majorSeveritySanctionMap?.[index] || {}),
    min: rule.min,
    max: rule.max,
  }));

  runtimeHandbook = {
    ...runtimeHandbook,
    offenseTypes: (runtimeHandbook.offenseTypes || []).map((type) => {
      if (type.id === 'minor') return { ...type, sanctionSchedule: minorSchedule };
      if (type.id === 'major') return { ...type, severitySanctionMap: majorSchedule };
      return type;
    }),
  };

  rebuildIndexes();
}

export function applyHandbookOverrides(overrides = {}) {
  runtimeHandbook = structuredClone(baseHandbook);

  if (overrides.offenseGroups) {
    runtimeHandbook = {
      ...runtimeHandbook,
      offenseGroups: overrides.offenseGroups.map((group) => ({
        ...group,
        offenses: Array.isArray(group.offenses) ? group.offenses.map((offense) => ({ ...offense })) : [],
      })),
    };
  }

  if (overrides.offenseTypes) {
    runtimeHandbook = {
      ...runtimeHandbook,
      offenseTypes: overrides.offenseTypes.map((type) => ({
        ...type,
        subcategories: Array.isArray(type.subcategories) ? type.subcategories.map((sub) => ({ ...sub })) : [],
        sanctionSchedule: Array.isArray(type.sanctionSchedule) ? type.sanctionSchedule.map((rule) => ({ ...rule })) : [],
        severitySanctionMap: Array.isArray(type.severitySanctionMap) ? type.severitySanctionMap.map((rule) => ({ ...rule })) : [],
      })),
    };
  }

  rebuildIndexes();
}

export function addHandbookOffense(groups, { categoryId, subcategoryId, groupTitle, title, isIllegal = false }) {
  const catalog = (groups || runtimeHandbook.offenseGroups).map((group) => ({
    ...group,
    offenses: Array.isArray(group.offenses) ? group.offenses.map((offense) => ({ ...offense })) : [],
  }));

  const cleanedTitle = String(title || '').trim();
  if (!cleanedTitle) {
    return catalog;
  }

  const normalizedGroupTitle = String(groupTitle || '').trim();
  const targetGroup = catalog.find((group) =>
    group.categoryId === categoryId &&
    group.subcategoryId === subcategoryId &&
    String(group.groupTitle || '').trim().toLowerCase() === normalizedGroupTitle.toLowerCase()
  );

  if (targetGroup) {
    const offenseExists = targetGroup.offenses.some((offense) =>
      String(offense.title || '').trim().toLowerCase() === cleanedTitle.toLowerCase()
    );
    if (!offenseExists) {
      targetGroup.offenses.push({
        id: `${categoryId}-${subcategoryId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        title: cleanedTitle,
        isIllegal: Boolean(isIllegal),
      });
    }
    return catalog;
  }

  const highestNumber = catalog
    .filter((group) => group.categoryId === categoryId && group.subcategoryId === subcategoryId)
    .reduce((max, group) => Math.max(max, Number(group.handbookNumber) || 0), 0);

  catalog.push({
    handbookNumber: highestNumber + 1,
    categoryId,
    subcategoryId,
    groupTitle: normalizedGroupTitle,
    offenses: [{
      id: `${categoryId}-${subcategoryId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      title: cleanedTitle,
      isIllegal: Boolean(isIllegal),
    }],
  });

  return catalog;
}

export function removeHandbookOffense(groups, { categoryId, subcategoryId, groupTitle, title }) {
  const targetGroupTitle = String(groupTitle || '').trim().toLowerCase();
  const targetTitle = String(title || '').trim().toLowerCase();

  const baseGroups = (groups || runtimeHandbook.offenseGroups)
    .map((group) => ({
      ...group,
      offenses: Array.isArray(group.offenses) ? group.offenses.map((offense) => ({ ...offense })) : [],
    }));

  const filteredGroups = baseGroups
    .filter((group) => {
      const matchesTarget =
        group.categoryId === categoryId &&
        group.subcategoryId === subcategoryId &&
        String(group.groupTitle || '').trim().toLowerCase() === targetGroupTitle;
      if (!matchesTarget) return true;
      const nextOffenses = (group.offenses || []).filter((offense) =>
        String(offense.title || '').trim().toLowerCase() !== targetTitle
      );
      return nextOffenses.length > 0;
    })
    .map((group) => {
      const matchesTarget =
        group.categoryId === categoryId &&
        group.subcategoryId === subcategoryId &&
        String(group.groupTitle || '').trim().toLowerCase() === targetGroupTitle;
      if (!matchesTarget) return group;
      return {
        ...group,
        offenses: (group.offenses || []).filter((offense) =>
          String(offense.title || '').trim().toLowerCase() !== targetTitle
        ),
      };
    });

  return filteredGroups.sort((left, right) => {
    const categoryRank = { minor: 0, major: 1 };
    const leftRank = categoryRank[left.categoryId] ?? 99;
    const rightRank = categoryRank[right.categoryId] ?? 99;
    if (leftRank !== rightRank) return leftRank - rightRank;
    if (left.subcategoryId !== right.subcategoryId) return String(left.subcategoryId).localeCompare(String(right.subcategoryId));
    return Number(left.handbookNumber || 0) - Number(right.handbookNumber || 0);
  });
}

/**
 * Returns all offense types (minor / major) with their subcategory lists.
 */
export function listOffenseTypes() {
  return runtimeHandbook.offenseTypes || [];
}

/**
 * Returns all offense groups filtered by categoryId and optionally subcategoryId.
 * @param {'minor'|'major'} categoryId
 * @param {'light'|'less_serious'|'serious'|'very_serious'} [subcategoryId]
 */
export function listOffenseGroups(categoryId, subcategoryId = null) {
  return (runtimeHandbook.offenseGroups || []).filter(
    (group) =>
      group.categoryId === categoryId &&
      (subcategoryId === null || group.subcategoryId === subcategoryId)
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
  const minor = runtimeHandbook.offenseTypes?.find((type) => type.id === 'minor');
  if (!minor) return null;
  const clamped = Math.min(Math.max(offenseNumber, 1), 3);
  return minor.sanctionSchedule.find((rule) => rule.offenseNumber === clamped) ?? null;
}

/**
 * Returns the handbook sanction for a MAJOR offense based on admin severity score (1-10).
 * @param {number} score — integer 1 to 10
 * @returns {{ label: string, sanction: string } | null}
 */
export function getMajorSanctionByScore(score) {
  const major = runtimeHandbook.offenseTypes?.find((type) => type.id === 'major');
  if (!major) return null;
  const clamped = Math.min(Math.max(score, 1), 10);
  return major.severitySanctionMap.find((rule) => clamped >= rule.min && clamped <= rule.max) ?? null;
}

/**
 * Returns the full sanctionSchedule array for minor offenses.
 */
export function getMinorSanctionSchedule() {
  return runtimeHandbook.offenseTypes?.find((type) => type.id === 'minor')?.sanctionSchedule ?? [];
}

/**
 * Returns the full severitySanctionMap array for major offenses.
 */
export function getMajorSanctionMap() {
  return runtimeHandbook.offenseTypes?.find((type) => type.id === 'major')?.severitySanctionMap ?? [];
}

/**
 * Returns subcategories for a given offense type id.
 * @param {'minor'|'major'} offenseTypeId
 */
export function getSubcategories(offenseTypeId) {
  return runtimeHandbook.offenseTypes?.find((type) => type.id === offenseTypeId)?.subcategories ?? [];
}

export { handbook as handbookDiscipline };
