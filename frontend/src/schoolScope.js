export const SCHOOL_SCOPES = Object.freeze({
  ELEMENTARY: 'elementary',
  HIGH_SCHOOL: 'high_school',
  SHARED: 'shared',
  ALL: 'all',
});

const VALID_ROLES = new Set(['superadmin', 'counselor']);
const COUNSELOR_SCOPES = new Set([SCHOOL_SCOPES.ELEMENTARY, SCHOOL_SCOPES.HIGH_SCHOOL]);
const ELEMENTARY_GRADES = new Set([1, 2, 3, 4, 5, 6]);
const HIGH_SCHOOL_GRADES = new Set([7, 8, 9, 10]);

export function normalizeYearLevel(value) {
  const original = String(value ?? '').trim();
  const normalized = original.toLowerCase();
  if (!normalized) return '';
  if (/^(kindergarten|kinder|kg|k)$/.test(normalized)) return 'Kindergarten';

  const gradeFirst = normalized.match(/^(\d{1,2})(?:st|nd|rd|th)?(?:\s*grade)?$/);
  const gradeLast = normalized.match(/^grade\s*(\d{1,2})$/);
  const grade = Number(gradeFirst?.[1] || gradeLast?.[1]);
  if (grade < 1 || grade > 10) return original;

  const remainder = grade % 100;
  const suffix = remainder >= 11 && remainder <= 13
    ? 'th'
    : ({ 1: 'st', 2: 'nd', 3: 'rd' }[grade % 10] || 'th');
  return `${grade}${suffix} Grade`;
}

export function getSchoolScopeForYear(value) {
  const normalized = String(value ?? '').trim().toLowerCase();
  if (!normalized) return SCHOOL_SCOPES.SHARED;
  if (/^(kindergarten|kinder|kg|k)$/.test(normalized)) return SCHOOL_SCOPES.ELEMENTARY;

  const gradeFirst = normalized.match(/^(\d{1,2})(?:st|nd|rd|th)?(?:\s*grade)?$/);
  const gradeLast = normalized.match(/^grade\s*(\d{1,2})$/);
  const grade = Number(gradeFirst?.[1] || gradeLast?.[1]);

  if (ELEMENTARY_GRADES.has(grade)) return SCHOOL_SCOPES.ELEMENTARY;
  if (HIGH_SCHOOL_GRADES.has(grade)) return SCHOOL_SCOPES.HIGH_SCHOOL;
  return SCHOOL_SCOPES.SHARED;
}

export function isValidRoleProfile(profile) {
  if (!profile || !VALID_ROLES.has(profile.role)) return false;
  if (profile.role === 'superadmin') return profile.school_scope === SCHOOL_SCOPES.ALL;
  return COUNSELOR_SCOPES.has(profile.school_scope);
}

export function isRoleProfileForLoginType(profile, loginType) {
  if (!isValidRoleProfile(profile)) return false;
  if (loginType === 'superadmin') return profile.role === 'superadmin';
  return profile.role === 'counselor' && profile.school_scope === loginType;
}

export function getAllowedSchoolScopes(profile) {
  if (!isValidRoleProfile(profile)) return [];
  if (profile.role === 'superadmin') return null;
  return [profile.school_scope, SCHOOL_SCOPES.SHARED];
}

export function canAccessSchoolScope(profile, recordScope) {
  if (!isValidRoleProfile(profile)) return false;
  if (profile.role === 'superadmin') return true;
  return recordScope === profile.school_scope || recordScope === SCHOOL_SCOPES.SHARED;
}

export function getScopeForStudent(student) {
  return getSchoolScopeForYear(student?.year_level ?? student?.year);
}
