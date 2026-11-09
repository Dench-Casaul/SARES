function ordinal(n) {
  const num = Number(n);
  if (num === 1) return '1st';
  if (num === 2) return '2nd';
  if (num === 3) return '3rd';
  if (!Number.isFinite(num) || num <= 0) return '1st';
  const remainder = num % 100;
  const suffix = remainder >= 11 && remainder <= 13
    ? 'th'
    : ({ 1: 'st', 2: 'nd', 3: 'rd' }[num % 10] || 'th');
  return `${num}${suffix}`;
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

  if (type === 'minor' || type === 'major') {
    const rawNumber = record.cumulative_offense_number ?? record.offense_number ?? record.offenseNumber;
    const number = Number(rawNumber);
    const level = String(record.subcategory_id || record.subcategoryId || '').replace('_', ' ');
    const scope = record.school_scope === 'elementary'
      ? 'Elementary'
      : record.school_scope === 'high_school' ? 'High School' : '';
    const detail = [
      level ? `${level} level` : '',
      Number.isFinite(number) && number > 0 ? `${ordinal(number)} offense` : '',
      scope,
    ].filter(Boolean).join(' · ');
    const sy = schoolYear ? ` (SY ${schoolYear})` : '';
    return `${type === 'minor' ? 'Minor' : 'Major'}${detail ? ` · ${detail}` : ''}${sy} → ${sanction}`;
  }

  return sanction;
}
