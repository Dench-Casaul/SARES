const DESCRIPTION_FIELDS = [
  ['incident_description', 'Incident Description'],
  ['description', 'Incident Description'],
  ['ai_counselor_recommendation', 'Counselor Recommendation'],
  ['ai_assisted_solution', 'AI-Assisted Solution'],
];

export function getViolationDescription(violation = {}) {
  for (const [field, label] of DESCRIPTION_FIELDS) {
    const text = typeof violation[field] === 'string' ? violation[field].trim() : '';
    if (text) return { label, text, source: field };
  }

  return { label: 'Incident Description', text: '', source: null };
}
