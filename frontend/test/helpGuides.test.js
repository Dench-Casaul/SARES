import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { GUIDES, GUIDE_CATEGORIES, filterGuides } from '../src/helpGuides.js';

const appRoutes = [...readFileSync(new URL('../src/App.jsx', import.meta.url), 'utf8').matchAll(/<Route path="([^"]+)"/g)]
  .map((match) => match[1]);

test('every guide has a unique id, a known topic, a title, and steps', () => {
  const ids = new Set();
  const categories = new Set(GUIDE_CATEGORIES.map((category) => category.id));
  for (const guide of GUIDES) {
    assert.ok(!ids.has(guide.id), `duplicate guide id ${guide.id}`);
    ids.add(guide.id);
    assert.match(guide.id, /^[a-z0-9-]+$/, `guide id ${guide.id} must be usable in a link`);
    assert.ok(categories.has(guide.category), `${guide.id} has unknown topic ${guide.category}`);
    assert.ok(guide.title && guide.summary, `${guide.id} needs a title and summary`);
    assert.ok(Array.isArray(guide.steps) && guide.steps.length > 0, `${guide.id} needs steps`);
  }
  for (const category of GUIDE_CATEGORIES) {
    assert.ok(GUIDES.some((guide) => guide.category === category.id), `topic ${category.id} has no guides`);
  }
});

test('guide links open pages that exist', () => {
  for (const guide of GUIDES.filter((item) => item.link)) {
    assert.ok(appRoutes.includes(guide.link.to), `${guide.id} links to unknown page ${guide.link.to}`);
  }
  assert.ok(appRoutes.includes('/sares/help'), 'the How-to Guide page itself is routed');
});

test('superadmin-only guides are hidden from counselors', () => {
  const counselorIds = filterGuides({ role: 'counselor' }).map((guide) => guide.id);
  const superadminIds = filterGuides({ role: 'superadmin' }).map((guide) => guide.id);
  assert.ok(!counselorIds.includes('violation-catalog'));
  assert.ok(!counselorIds.includes('system-logs'));
  assert.ok(superadminIds.includes('violation-catalog'));
  assert.equal(superadminIds.length, GUIDES.length);
});

test('search matches words anywhere in a guide', () => {
  const ids = (search) => filterGuides({ role: 'counselor', search }).map((guide) => guide.id);
  assert.ok(ids('suspension').includes('suspension'));
  assert.ok(ids('print').includes('print-report'));
  assert.ok(ids('LRN student').includes('add-student'));
  assert.deepEqual(ids('nonexistent-term-xyz'), []);
});
