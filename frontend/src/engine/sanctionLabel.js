import { getMajorSanctionByScore } from '../data/handbookIndex.js';

function ordinal(n) {
  const num = Number(n);
  if (num === 1) return '1st';
  if (num === 2) return '2nd';
  if (num === 3) return '3rd';
  if (!Number.isFinite(num) || num <= 0) return '1st';
  return `${num}th`;
}

export function shouldHideSanction(record) {
  const intervention = String(record?.intervention_type || '').toLowerCase();
  const status = String(record?.status || '').toLowerCase();
  const mediation = String(record?.mediation_status || '').toLowerCase();
  return intervention === 'mediation' && (status === 'resolved' || mediation === 'resolved');
}

/**
 * Human-readable identifier for why a handbook sanction applies.
 * Example: `Minor · 2nd offense (SY 2025-2026) → Written warning…`
 */
export function formatIdentifiedSanction(record = {}) {
  if (shouldHideSanction(record)) return '—';

  const sanction =
    record.recommended_sanction ||
    record.recommendedSanction ||
    'N/A';
  const type = String(record.offense_type || record.offenseType || '').toLowerCase();
  const schoolYear = record.school_year_key || record.schoolYearKey || '';

  if (type === 'minor') {
    const n = record.cumulative_offense_number || record.offense_number || record.offenseNumber || 1;
    const sy = schoolYear ? ` (SY ${schoolYear})` : '';
    return `Minor · ${ordinal(n)} offense${sy} → ${sanction}`;
  }

  if (type === 'major') {
    const score = record.severity_score ?? record.severityScore;
    const band = getMajorSanctionByScore(Number(score) || 1);
    const bandText = band?.label
      ? `score ${score} (${band.label})`
      : `score ${score ?? 'N/A'}`;
    return `Major · ${bandText} → ${sanction}`;
  }

  return sanction;
}
