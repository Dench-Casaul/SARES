import test from 'node:test';
import assert from 'node:assert/strict';
import {
  canAccessSchoolScope,
  getAllowedSchoolScopes,
  getSchoolScopeForYear,
  isValidRoleProfile,
  normalizeYearLevel,
} from '../src/schoolScope.js';

test('school grade mapping separates elementary and high school', () => {
  assert.equal(getSchoolScopeForYear('Kindergarten'), 'elementary');
  assert.equal(getSchoolScopeForYear('1st Grade'), 'elementary');
  assert.equal(getSchoolScopeForYear('Grade 6'), 'elementary');
  assert.equal(normalizeYearLevel('Grade 6'), '6th Grade');
  assert.equal(normalizeYearLevel('k'), 'Kindergarten');
  assert.equal(getSchoolScopeForYear('7th Grade'), 'high_school');
  assert.equal(getSchoolScopeForYear('Grade 10'), 'high_school');
});

test('unrecognized grades are shared and visible to both counselor scopes', () => {
  assert.equal(getSchoolScopeForYear('Grade 11'), 'shared');
  assert.equal(getSchoolScopeForYear(''), 'shared');
  assert.deepEqual(getAllowedSchoolScopes({ role: 'counselor', school_scope: 'elementary' }), ['elementary', 'shared']);
  assert.deepEqual(getAllowedSchoolScopes({ role: 'counselor', school_scope: 'high_school' }), ['high_school', 'shared']);
});

test('role profiles fail closed and scope access follows the assigned role', () => {
  assert.equal(isValidRoleProfile({ role: 'superadmin', school_scope: 'all' }), true);
  assert.equal(isValidRoleProfile({ role: 'counselor', school_scope: 'elementary' }), true);
  assert.equal(isValidRoleProfile({ role: 'admin', school_scope: 'all' }), false);
  assert.equal(isValidRoleProfile({ role: 'counselor', school_scope: 'all' }), false);
  assert.equal(canAccessSchoolScope({ role: 'counselor', school_scope: 'elementary' }, 'elementary'), true);
  assert.equal(canAccessSchoolScope({ role: 'counselor', school_scope: 'elementary' }, 'shared'), true);
  assert.equal(canAccessSchoolScope({ role: 'counselor', school_scope: 'elementary' }, 'high_school'), false);
  assert.equal(canAccessSchoolScope({ role: 'superadmin', school_scope: 'all' }, 'high_school'), true);
  assert.equal(canAccessSchoolScope({ role: 'counselor', school_scope: 'elementary' }, undefined), false);
});
