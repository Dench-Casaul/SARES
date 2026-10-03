import test from 'node:test';
import assert from 'node:assert/strict';
import { addHandbookOffense, removeHandbookOffense, getHandbook } from '../src/data/handbookIndex.js';

test('addHandbookOffense inserts a new violation into the correct offense type and severity bucket', () => {
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
