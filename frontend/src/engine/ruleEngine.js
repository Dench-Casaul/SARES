/**
 * SARES rule engine: handbook schedule (Section IV) when categories are configured,
 * otherwise legacy per-rule repeat escalation.
 *
 * Handbook text lives in src/data/generalizedHandbook.json (loaded via handbookIndex).
 *
 * Severity: the handbook does not define numeric scores. `recommendedSeverity` uses the
 * encoded rule `severity` plus a small tier bump (document for your thesis as the
 * operational mapping from ordinal to a 1–10 display scale).
 */

import { getScheduleTier } from '../data/handbookIndex';

const DEFAULT_ESCALATION = {
  tier2Append:
    ' Repeated offense: include a parent conference and document the prior incident in the student record.',
  tier3Append:
    ' Third or subsequent offense for this variety: refer to the Discipline Committee and consider suspension per handbook.',
  severityBumpPerRepeat: 0.5,
  maxSeverity: 10,
};

export const MODIFIER_WEIGHTS = {
  'intentional misconduct': 2,
  'threatening behavior': 3,
  'property damage': 2,
  'harm caused': 2,
  'repeat offense': 1.5,
  'cooperative behavior': -1,
};

export function extractContextModifiers(modifiers = []) {
  const appliedModifiers = [];
  let totalModifierScore = 0;

  modifiers.forEach(mod => {
    const name = mod.toLowerCase();
    const weight = MODIFIER_WEIGHTS[name];
    if (weight !== undefined) {
      appliedModifiers.push({ name, weight });
      totalModifierScore += weight;
    }
  });

  return { appliedModifiers, totalModifierScore };
}

export function computeSeverityScore(baseSeverity, totalModifierScore, historicalEscalationBump) {
  const rawScore = baseSeverity + totalModifierScore + historicalEscalationBump;
  return clamp(Math.round(rawScore), 1, 10);
}

export function computeRiskLevel(severityScore) {
  if (severityScore <= 3) return 'Low Risk';
  if (severityScore <= 7) return 'Medium Risk';
  return 'High Risk';
}

export function generateExplanationPayload(riskLevel, finalScore, baseSeverity, appliedModifiers, historicalEscalationBump) {
  let prompt = `Explain this disciplinary recommendation: The student is classified as ${riskLevel} with a final severity score of ${finalScore}/10. `;
  prompt += `The baseline offense severity was ${baseSeverity}. `;
  
  const reasons = [];
  if (historicalEscalationBump > 0) {
    reasons.push(`repeated offenses (+${historicalEscalationBump})`);
  }
  
  const negativeMods = appliedModifiers.filter(m => m.weight > 0);
  if (negativeMods.length > 0) {
    reasons.push(`aggravating factors: ${negativeMods.map(m => `${m.name} (+${m.weight})`).join(', ')}`);
  }
  
  if (reasons.length > 0) {
    prompt += `The score increased due to ${reasons.join(' and ')}. `;
  }
  
  const positiveMods = appliedModifiers.filter(m => m.weight < 0);
  if (positiveMods.length > 0) {
    prompt += `Mitigating factors were considered: ${positiveMods.map(m => `${m.name} (${m.weight})`).join(', ')}. `;
  }
  
  prompt += `Keep the explanation professional and concise, summarizing the justification for this risk level without being overly robotic.`;
  
  const deterministicExplanation = `Student classified as ${riskLevel} (Score: ${finalScore}/10). Base severity: ${baseSeverity}. ` +
    (reasons.length > 0 ? `Increases: ${reasons.join(', ')}. ` : '') +
    (positiveMods.length > 0 ? `Mitigations: ${positiveMods.map(m => m.name).join(', ')}.` : '');
    
  return {
    prompt,
    deterministicExplanation: deterministicExplanation.trim()
  };
}

/** Month (1–12) when the school year label rolls over. Default 6 = June (common PH). */
export const SCHOOL_YEAR_START_MONTH = 6;

function normId(value) {
  if (value == null) return '';
  return String(value);
}

function clamp(n, lo, hi) {
  return Math.min(hi, Math.max(lo, n));
}

/**
 * @param {string} isoDate — `YYYY-MM-DD` from date input
 * @returns {string} e.g. `2025-2026`
 */
export function getSchoolYearKey(isoDate) {
  if (!isoDate || typeof isoDate !== 'string') return '';
  const [y, m] = isoDate.split('-').map(Number);
  if (!y || !m) return '';
  const start = m >= SCHOOL_YEAR_START_MONTH ? y : y - 1;
  return `${start}-${start + 1}`;
}

function violationSchoolYear(v) {
  if (v?.school_year_key) return String(v.school_year_key);
  return getSchoolYearKey(v?.incident_date);
}

function normalizeHandbookTrack(value) {
  const s = normId(value).toLowerCase();
  if (s === 'major' || s === 'minor') return s;
  return '';
}

/**
 * @param {object} params
 * @param {string} params.studentId
 * @param {string} params.ruleId
 * @param {string} params.categoryName
 * @param {object[]} params.existingViolations — raw Firestore violation payloads
 */
export function buildViolationFacts({
  studentId,
  ruleId,
  categoryName,
  existingViolations = [],
}) {
  const sid = normId(studentId);
  const rid = normId(ruleId);
  const cat = categoryName == null ? '' : String(categoryName);

  const forStudent = existingViolations.filter((v) => normId(v?.student_id) === sid);

  const sameRulePrior = forStudent.filter((v) => normId(v?.rule_id) === rid);
  const sameCategoryPrior = forStudent.filter(
    (v) => String(v?.category_name ?? '') === cat
  );

  const priorCountSameRule = sameRulePrior.length;
  const incidentNumberForRule = priorCountSameRule + 1;

  return {
    studentId: sid,
    ruleId: rid,
    categoryName: cat,
    priorCountSameRule,
    priorCountSameCategory: sameCategoryPrior.length,
    priorTotalViolations: forStudent.length,
    incidentNumberForRule,
  };
}

/**
 * Prior counts for handbook Section IV (same school year). Only violations with
 * `handbook_track` stored are counted so legacy rows do not skew tiers.
 *
 * @param {object} params
 * @param {string} params.studentId
 * @param {string} params.schoolYearKey
 * @param {object[]} params.existingViolations
 */
export function buildHandbookFacts({ studentId, schoolYearKey, existingViolations = [] }) {
  const sid = normId(studentId);
  const sy = normId(schoolYearKey);

  const inYear = existingViolations.filter(
    (v) => normId(v?.student_id) === sid && violationSchoolYear(v) === sy
  );

  let minorActCount = 0;
  let majorActCount = 0;
  for (const v of inYear) {
    const t = normalizeHandbookTrack(v?.handbook_track);
    if (t === 'minor') minorActCount += 1;
    else if (t === 'major') majorActCount += 1;
  }

  return {
    studentId: sid,
    schoolYearKey: sy,
    minorActCountPrior: minorActCount,
    majorActCountPrior: majorActCount,
    violationsInYearTagged: minorActCount + majorActCount,
  };
}

/**
 * @param {'major'|'minor'} actTrack — classification of this incident (from category)
 * @param {ReturnType<typeof buildHandbookFacts>} hf
 */
export function resolveHandbookSanctionTrackAndTier(actTrack, hf) {
  const notes = [];
  let sanctionTrack = actTrack;
  let tierOrdinal = 1;
  let elevationApplied = false;

  if (actTrack === 'minor') {
    if (hf.minorActCountPrior >= 2) {
      sanctionTrack = 'major';
      elevationApplied = true;
      if (hf.majorActCountPrior === 0) {
        tierOrdinal = clamp(hf.minorActCountPrior - 1, 1, 3);
      } else {
        tierOrdinal = clamp(hf.majorActCountPrior + 1, 1, 3);
      }
      notes.push(
        'Handbook II.A.16 / Section IV (minor): prior minor count in this school year triggers major sanction schedule.'
      );
    } else {
      tierOrdinal = clamp(hf.minorActCountPrior + 1, 1, 3);
    }
  } else {
    tierOrdinal = clamp(hf.majorActCountPrior + 1, 1, 3);
  }

  const tier = getScheduleTier(sanctionTrack, tierOrdinal);
  const recommendedSanction = tier
    ? tier.sanctions.join('\n')
    : '— (handbook tier not found)';

  if (tier?.subsequentViolationsNote && sanctionTrack === 'minor' && tierOrdinal === 3) {
    notes.push(tier.subsequentViolationsNote);
  }

  return {
    sanctionTrack,
    tierOrdinal,
    tierLabel: tier?.label ?? '',
    recommendedSanction,
    elevationApplied,
    notes,
    handbookSection: 'IV',
  };
}

function handbookSeverity(rule, sanctionTrack, tierOrdinal) {
  const base = Number(rule?.severity) || 0;
  const bump = tierOrdinal - 1;
  const weight = sanctionTrack === 'major' ? 2 : 1;
  return clamp(Math.round(base + bump * weight), 1, 10);
}

/**
 * @param {object} rule — Firestore rule doc
 * @param {object} [options]
 * @param {object} [options.escalation]
 * @param {string[]} [options.modifiers]
 */
export function evaluateRecommendation(rule, facts, options = {}) {
  const escalation = { ...DEFAULT_ESCALATION, ...(options.escalation || {}) };
  const modifiers = options.modifiers || [];

  const baseSanction = rule?.recommended_sanction || rule?.sanction || '';
  const baseSeverity = Number(rule?.severity) || 0;
  const n = facts.incidentNumberForRule;

  const notes = [];
  let tier = 1;
  let recommendedSanction = baseSanction;
  let historicalEscalationBump = 0;

  if (n >= 3) {
    tier = 3;
    notes.push(`This would be offense #${n} for this same variety under this student.`);
    recommendedSanction =
      rule?.sanction_repeat_3 != null && String(rule.sanction_repeat_3).trim() !== ''
        ? String(rule.sanction_repeat_3)
        : `${baseSanction}${escalation.tier3Append}`;
  } else if (n >= 2) {
    tier = 2;
    notes.push(`This would be offense #${n} for this same variety under this student.`);
    recommendedSanction =
      rule?.sanction_repeat_2 != null && String(rule.sanction_repeat_2).trim() !== ''
        ? String(rule.sanction_repeat_2)
        : `${baseSanction}${escalation.tier2Append}`;
  } else {
    notes.push('First recorded offense for this variety for this student.');
  }

  if (n >= 2 && escalation.severityBumpPerRepeat > 0) {
    historicalEscalationBump = Math.min(
      escalation.maxSeverity - baseSeverity,
      Math.ceil((n - 1) * escalation.severityBumpPerRepeat)
    );
    if (historicalEscalationBump > 0) {
      notes.push(`Historical escalation bump applied: +${historicalEscalationBump}`);
    }
  }

  const { appliedModifiers, totalModifierScore } = extractContextModifiers(modifiers);
  const recommendedSeverity = computeSeverityScore(baseSeverity, totalModifierScore, historicalEscalationBump);
  const riskLevel = computeRiskLevel(recommendedSeverity);
  const xaiPayload = generateExplanationPayload(riskLevel, recommendedSeverity, baseSeverity, appliedModifiers, historicalEscalationBump);

  if (appliedModifiers.length > 0) {
    notes.push(`Context modifiers applied: ${appliedModifiers.map(m => m.name).join(', ')} (Total: ${totalModifierScore})`);
  }

  return {
    mode: 'legacy',
    tier,
    tierOrdinal: tier,
    sanctionTrack: null,
    baseRecommendedSanction: baseSanction,
    recommendedSanction,
    baseSeverity,
    recommendedSeverity,
    riskLevel,
    xaiPayload,
    appliedModifiers,
    provision: rule?.provision || '',
    offenseVariety: rule?.offense_variety || '',
    notes,
    escalated: tier > 1,
    elevationApplied: false,
  };
}

/**
 * Single entry for Violation page preview + submit.
 *
 * @param {object} params
 * @param {object} params.rule
 * @param {object} params.category — Firestore offense_categories row; optional `handbook_track`: 'major'|'minor'
 * @param {string} params.studentId
 * @param {string} params.incidentDate — YYYY-MM-DD
 * @param {object[]} params.existingViolations
 * @param {string[]} [params.modifiers]
 */
export function evaluateSaresRecommendation({
  rule,
  category,
  studentId,
  incidentDate,
  existingViolations = [],
  modifiers = [],
}) {
  const schoolYearKey = getSchoolYearKey(incidentDate);
  const actTrack = normalizeHandbookTrack(category?.handbook_track);

  const legacyFacts = buildViolationFacts({
    studentId,
    ruleId: rule?.rule_id,
    categoryName: category?.category_name,
    existingViolations,
  });

  if (!actTrack) {
    const rec = evaluateRecommendation(rule, legacyFacts, { modifiers });
    return {
      ...rec,
      mode: 'legacy',
      schoolYearKey,
      facts: { legacy: legacyFacts, handbook: null },
    };
  }

  const hf = buildHandbookFacts({
    studentId,
    schoolYearKey,
    existingViolations,
  });

  const resolved = resolveHandbookSanctionTrackAndTier(actTrack, hf);
  
  const baseSeverity = Number(rule?.severity) || 0;
  const handbookCalculatedSeverity = handbookSeverity(
    rule,
    resolved.sanctionTrack,
    resolved.tierOrdinal
  );
  const historicalEscalationBump = handbookCalculatedSeverity - baseSeverity;

  const { appliedModifiers, totalModifierScore } = extractContextModifiers(modifiers);
  const recommendedSeverity = computeSeverityScore(baseSeverity, totalModifierScore, historicalEscalationBump);
  const riskLevel = computeRiskLevel(recommendedSeverity);
  const xaiPayload = generateExplanationPayload(riskLevel, recommendedSeverity, baseSeverity, appliedModifiers, historicalEscalationBump);

  const notes = [
    ...resolved.notes,
    `School year ${schoolYearKey}: ${hf.minorActCountPrior} prior minor act(s), ${hf.majorActCountPrior} prior major act(s) counted in engine (tagged records only).`,
  ];

  if (historicalEscalationBump > 0) {
    notes.push(`Handbook escalation bump applied: +${historicalEscalationBump}`);
  }
  if (appliedModifiers.length > 0) {
    notes.push(`Context modifiers applied: ${appliedModifiers.map(m => m.name).join(', ')} (Total: ${totalModifierScore})`);
  }
  if (hf.violationsInYearTagged === 0 && existingViolations.length > 0) {
    notes.push(
      'Note: Prior violations without handbook_track are excluded from tier counts. Backfill that field for accurate history.'
    );
  }

  return {
    mode: 'handbook',
    tier: resolved.tierOrdinal,
    tierOrdinal: resolved.tierOrdinal,
    tierLabel: resolved.tierLabel,
    sanctionTrack: resolved.sanctionTrack,
    actTrack,
    baseRecommendedSanction: rule?.recommended_sanction || rule?.sanction || '',
    recommendedSanction: resolved.recommendedSanction,
    baseSeverity,
    recommendedSeverity,
    riskLevel,
    xaiPayload,
    appliedModifiers,
    provision: rule?.provision || 'Student Discipline Policy — Section IV',
    offenseVariety: rule?.offense_variety || '',
    notes,
    escalated: resolved.tierOrdinal > 1 || resolved.elevationApplied,
    elevationApplied: resolved.elevationApplied,
    schoolYearKey,
    facts: {
      legacy: legacyFacts,
      handbook: hf,
    },
    trace: {
      handbookSection: resolved.handbookSection,
      schedule: resolved.sanctionTrack === 'major' ? 'majorOffenses' : 'minorOffenses',
      tierLabel: resolved.tierLabel,
    },
  };
}
