/**
 * Offense recommendation helpers (client side).
 *
 * Flow: the counselor writes the incident narrative first; the AI suggests the
 * matching handbook offenses; the counselor confirms one (or browses manually);
 * the rule engine then decides the sanction from the confirmed offense.
 */

/** How the confirmed offense was chosen, stored on each case as `offense_selection_method`. */
export const OFFENSE_SELECTION_METHOD = Object.freeze({
  AI_TOP_MATCH: 'ai_top_match',
  AI_OTHER_MATCH: 'ai_other_match',
  MANUAL: 'manual',
});

/** The handbook offenses in the shape `/api/recommend-offense` expects. */
export function buildOffenseCatalog(handbook) {
  return (handbook?.offenseGroups || []).flatMap((group) => (
    (group.offenses || []).map((offense) => ({
      id: offense.id,
      title: offense.title,
      categoryId: group.categoryId,
      subcategoryId: group.subcategoryId,
      groupTitle: group.groupTitle,
    }))
  ));
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function studentLabel(index) {
  let label = '';
  let n = index;
  do {
    label = String.fromCharCode(65 + (n % 26)) + label;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return `Student ${label}`;
}

/**
 * Replaces the selected students' names in a narrative with "Student A",
 * "Student B", … before it is sent to the AI. Full names are replaced before
 * single name parts; parts shorter than 3 letters are left alone to avoid
 * damaging ordinary words. The stored narrative is not changed.
 */
export function redactStudentNames(text, students = []) {
  let result = String(text || '');
  const replacements = [];

  students.forEach((student, index) => {
    const label = studentLabel(index);
    const names = new Set([
      student?.full_name,
      [student?.first_name, student?.last_name].filter(Boolean).join(' '),
      student?.first_name,
      student?.middle_name,
      student?.last_name,
    ].map((name) => String(name || '').trim().replace(/\s+/g, ' ')).filter((name) => name.length >= 3));
    names.forEach((name) => replacements.push({ name, label }));
  });

  replacements
    .sort((left, right) => right.name.length - left.name.length)
    .forEach(({ name, label }) => {
      const pattern = escapeRegExp(name).replace(/ /g, '\\s+');
      result = result.replace(new RegExp(`(?<![\\p{L}\\p{N}])${pattern}(?![\\p{L}\\p{N}])`, 'giu'), label);
    });

  return result;
}

/** Whether the confirmed offense was the AI's top match, another AI match, or chosen manually. */
export function getOffenseSelectionMethod(suggestions = [], offenseId = '') {
  const index = suggestions.findIndex((suggestion) => suggestion.offenseId === offenseId);
  if (index === 0) return OFFENSE_SELECTION_METHOD.AI_TOP_MATCH;
  if (index > 0) return OFFENSE_SELECTION_METHOD.AI_OTHER_MATCH;
  return OFFENSE_SELECTION_METHOD.MANUAL;
}

/** Short description of how the offense was identified, for review screens and reports. */
export function describeOffenseSelection(method, suggestionSource) {
  if (method === OFFENSE_SELECTION_METHOD.AI_TOP_MATCH) {
    return 'Recommended by AI from the incident narrative (top match) and confirmed by the counselor.';
  }
  if (method === OFFENSE_SELECTION_METHOD.AI_OTHER_MATCH) {
    return 'Recommended by AI from the incident narrative (alternative match) and confirmed by the counselor.';
  }
  if (suggestionSource === 'gemini') {
    return 'Selected manually by the counselor; the AI suggestions were not used.';
  }
  return 'Selected manually by the counselor.';
}
