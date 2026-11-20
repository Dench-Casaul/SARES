import test from 'node:test';
import assert from 'node:assert/strict';
import { clampPage, getPageItems, getTotalPages } from '../src/pagination.js';

test('getTotalPages is at least one page', () => {
  assert.equal(getTotalPages(0, 10), 1);
  assert.equal(getTotalPages(10, 10), 1);
  assert.equal(getTotalPages(11, 10), 2);
  assert.equal(getTotalPages(205, 10), 21);
});

test('clampPage keeps the page inside the available range', () => {
  assert.equal(clampPage(0, 5), 1);
  assert.equal(clampPage(9, 5), 5);
  assert.equal(clampPage(3, 5), 3);
  assert.equal(clampPage(Number.NaN, 5), 1);
  // A filter that shrinks the list never leaves the log on an empty page.
  assert.equal(clampPage(7, 1), 1);
});

test('getPageItems shows every page when there are only a few', () => {
  assert.deepEqual(getPageItems(1, 1), [1]);
  assert.deepEqual(getPageItems(2, 5), [1, 2, 3, 4, 5]);
});

test('getPageItems collapses distant pages into ellipses', () => {
  assert.deepEqual(getPageItems(6, 20), [1, 'ellipsis', 5, 6, 7, 'ellipsis', 20]);
  assert.deepEqual(getPageItems(1, 20), [1, 2, 'ellipsis', 20]);
  assert.deepEqual(getPageItems(20, 20), [1, 'ellipsis', 19, 20]);
});

test('getPageItems shows a single skipped page instead of an ellipsis', () => {
  assert.deepEqual(getPageItems(4, 20), [1, 2, 3, 4, 5, 'ellipsis', 20]);
  assert.deepEqual(getPageItems(3, 6), [1, 2, 3, 4, 5, 6]);
});
