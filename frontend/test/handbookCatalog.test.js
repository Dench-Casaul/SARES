import test from 'node:test';
import assert from 'node:assert/strict';
import {
  addHandbookOffense,
  applyHandbookOverrides,
  applySanctionOverrides,
  getHandbook,
  getSanctionOverrides,
  removeHandbookOffense,
  toSchoolSanctionOverrides,
} from '../src/data/handbookIndex.js';

test('addHandbookOffense inserts a new violation into the correct offense type and level bucket', () => {
  const base = structuredClone(getHandbook().offenseGroups);

  const updated = addHandbookOffense(base, {
    categoryId: 'minor',
    subcategoryId: 'light',
    groupTitle: 'Attendance and Punctuality',
    title: 'Leaving before the end of class without permission',
    isIllegal: false,
  });

  const target = updated.find((group) => group.groupTitle === 'Attendance and Punctuality' && group.categoryId === 'minor' && group.subcategoryId === 'light');
  assert.ok(target, 'expected a new group to be created');
  assert.ok(target.offenses.some((offense) => offense.title === 'Leaving before the end of class without permission'));
});

test('removeHandbookOffense removes the selected violation and prunes empty groups', () => {
  const base = structuredClone(getHandbook().offenseGroups);
  const existingGroup = base.find((group) => group.groupTitle === 'ID and Identification Violations' && group.categoryId === 'minor' && group.subcategoryId === 'light');
  assert.ok(existingGroup, 'expected the sample group to exist');

  const updated = removeHandbookOffense(base, {
    categoryId: 'minor',
    subcategoryId: 'light',
    groupTitle: 'ID and Identification Violations',
    title: 'Failure to wear school ID',
  });

  const group = updated.find((item) => item.groupTitle === 'ID and Identification Violations');
  assert.ok(group, 'expected the group to remain when other offenses exist');
  assert.ok(!group.offenses.some((offense) => offense.title === 'Failure to wear school ID'));
});

test('clearing handbook overrides restores the base catalog', () => {
  const defaultGroups = getHandbook().offenseGroups;
  applyHandbookOverrides({ offenseGroups: [] });
  assert.equal(getHandbook().offenseGroups.length, 0);

  applyHandbookOverrides();
  assert.equal(getHandbook().offenseGroups.length, defaultGroups.length);
});

test('progressive sanctions are scoped by offense level, school level, and offense number', () => {
  const handbook = getHandbook();
  const minorRules = handbook.offenseTypes.find((type) => type.id === 'minor').sanctionSchedule;
  const majorRules = handbook.offenseTypes.find((type) => type.id === 'major').sanctionSchedule;

  assert.equal(minorRules.filter((rule) => rule.subcategoryId === 'light' && rule.schoolScope === 'elementary').length, 4);
  assert.equal(minorRules.filter((rule) => rule.subcategoryId === 'less_serious' && rule.schoolScope === 'high_school').length, 4);
  assert.equal(majorRules.filter((rule) => rule.subcategoryId === 'serious' && rule.schoolScope === 'elementary').length, 3);
  assert.equal(majorRules.filter((rule) => rule.subcategoryId === 'serious' && rule.schoolScope === 'high_school').length, 2);

  const originalOverrides = getSanctionOverrides();
  const targetRule = originalOverrides.offenseSanctionSchedule.find((rule) =>
    rule.offenseTypeId === 'minor'
    && rule.subcategoryId === 'light'
    && rule.schoolScope === 'elementary'
    && rule.offenseNumber === 1
  );
  applySanctionOverrides({
    offenseSanctionSchedule: originalOverrides.offenseSanctionSchedule.map((rule) =>
      rule === targetRule ? { ...rule, sanction: 'Updated test sanction' } : rule
    ),
  });
  assert.equal(
    getHandbook().offenseTypes.find((type) => type.id === 'minor').sanctionSchedule
      .find((rule) => rule.subcategoryId === 'light' && rule.schoolScope === 'elementary' && rule.offenseNumber === 1).sanction,
    'Updated test sanction'
  );
  applySanctionOverrides(originalOverrides);
});

test('school sanction overrides update only their matching school schedule', () => {
  const originalOverrides = getSanctionOverrides();
  const elementarySchedule = toSchoolSanctionOverrides(originalOverrides.offenseSanctionSchedule, 'elementary');
  const originalHighSchoolRule = originalOverrides.offenseSanctionSchedule.find((rule) =>
    rule.offenseTypeId === 'minor'
    && rule.subcategoryId === 'light'
    && rule.schoolScope === 'high_school'
    && rule.offenseNumber === 1
  );
  const originalElementaryRule = originalOverrides.offenseSanctionSchedule.find((rule) =>
    rule.offenseTypeId === 'minor'
    && rule.subcategoryId === 'light'
    && rule.schoolScope === 'elementary'
    && rule.offenseNumber === 1
  );

  applySanctionOverrides({
    elementarySanctionOverrides: {
      ...elementarySchedule,
      'minor-light-1': 'Updated elementary sanction',
    },
  });

  const updatedOverrides = getSanctionOverrides().offenseSanctionSchedule;
  assert.equal(updatedOverrides.find((rule) =>
    rule.offenseTypeId === 'minor' && rule.subcategoryId === 'light' && rule.schoolScope === 'elementary' && rule.offenseNumber === 1
  ).sanction, 'Updated elementary sanction');
  assert.equal(updatedOverrides.find((rule) =>
    rule.offenseTypeId === 'minor' && rule.subcategoryId === 'light' && rule.schoolScope === 'high_school' && rule.offenseNumber === 1
  ).sanction, originalHighSchoolRule.sanction);
  applySanctionOverrides(originalOverrides);
  assert.equal(getSanctionOverrides().offenseSanctionSchedule.find((rule) =>
    rule.offenseTypeId === 'minor' && rule.subcategoryId === 'light' && rule.schoolScope === 'elementary' && rule.offenseNumber === 1
  ).sanction, originalElementaryRule.sanction);
});
