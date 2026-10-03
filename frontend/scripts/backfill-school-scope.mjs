import { applicationDefault, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { getSchoolScopeForYear, normalizeYearLevel } from '../src/schoolScope.js';

const projectId = process.env.GCLOUD_PROJECT || 'sares-system';
const applyChanges = process.argv.includes('--apply');
const adminApp = getApps()[0] || initializeApp({
  credential: applicationDefault(),
  projectId,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET || `${projectId}.firebasestorage.app`,
});
const db = getFirestore(adminApp);
const bucket = getStorage(adminApp).bucket();

function legacyStoragePath(file) {
  if (file?.path) return String(file.path);
  if (!file?.url) return '';
  try {
    const pathname = new URL(file.url).pathname;
    const encodedPath = pathname.split('/o/')[1];
    return encodedPath ? decodeURIComponent(encodedPath) : '';
  } catch {
    return '';
  }
}

function targetEvidencePath(oldPath, schoolScope) {
  const parts = oldPath.split('/').filter(Boolean);
  if (parts[0] !== 'evidence') return '';
  if (['elementary', 'high_school', 'shared'].includes(parts[1])) {
    return `evidence/${schoolScope}/${parts.slice(2).join('/')}`;
  }
  if (parts.length < 3) return '';
  return `evidence/${schoolScope}/${parts.slice(1).join('/')}`;
}

function linkedStudentScope(violation, scopeByStudentId, scopeByStudentNumber) {
  const byId = scopeByStudentId.get(String(violation.student_id || ''));
  if (byId) return byId;
  const byNumber = scopeByStudentNumber.get(String(violation.student_id || ''))
    || scopeByStudentNumber.get(String(violation.student_number || ''));
  if (byNumber) return byNumber;
  return getSchoolScopeForYear(violation.year_level || violation.student_year || violation.year);
}

async function commitUpdates(collectionName, updates) {
  for (let index = 0; index < updates.length; index += 450) {
    const batch = db.batch();
    updates.slice(index, index + 450).forEach(({ ref, data }) => batch.update(ref, data));
    await batch.commit();
  }
  console.log(`${collectionName} updated: ${updates.length}`);
}

const [studentsSnapshot, violationsSnapshot] = await Promise.all([
  db.collection('students').get(),
  db.collection('violations').get(),
]);

const scopeByStudentId = new Map();
const scopeByStudentNumber = new Map();
const studentUpdates = [];
let elementaryStudentCount = 0;
let highSchoolStudentCount = 0;
let sharedStudentCount = 0;
for (const studentDocument of studentsSnapshot.docs) {
  const student = studentDocument.data();
  const yearLevel = normalizeYearLevel(student.year_level || student.year);
  const schoolScope = getSchoolScopeForYear(yearLevel);
  if (schoolScope === 'elementary') elementaryStudentCount += 1;
  else if (schoolScope === 'high_school') highSchoolStudentCount += 1;
  else sharedStudentCount += 1;
  scopeByStudentId.set(studentDocument.id, schoolScope);
  if (student.student_id) scopeByStudentId.set(String(student.student_id), schoolScope);
  if (student.student_number) scopeByStudentNumber.set(String(student.student_number), schoolScope);
  const normalizedYear = yearLevel;
  if (student.school_scope !== schoolScope || student.year_level !== normalizedYear) {
    studentUpdates.push({
      ref: studentDocument.ref,
      data: { school_scope: schoolScope, year_level: normalizedYear },
    });
  }
}

const evidencePlans = new Map();
const evidencePathsToRevoke = new Set();
const violationUpdates = [];
let unlinkedViolationCount = 0;
let unresolvedEvidenceReferenceCount = 0;
for (const violationDocument of violationsSnapshot.docs) {
  const violation = violationDocument.data();
  const hasLinkedStudent = scopeByStudentId.has(String(violation.student_id || ''))
    || scopeByStudentNumber.has(String(violation.student_id || ''))
    || scopeByStudentNumber.has(String(violation.student_number || ''));
  if (!hasLinkedStudent) unlinkedViolationCount += 1;
  const schoolScope = linkedStudentScope(violation, scopeByStudentId, scopeByStudentNumber);
  const evidenceUrls = Array.isArray(violation.evidence_urls) ? violation.evidence_urls : [];
  const normalizedEvidence = evidenceUrls.map((file) => {
    const oldPath = legacyStoragePath(file);
    const newPath = oldPath ? targetEvidencePath(oldPath, schoolScope) : '';
    if (!oldPath || !newPath) unresolvedEvidenceReferenceCount += 1;
    if (oldPath) evidencePathsToRevoke.add(oldPath);
    if (oldPath && newPath && oldPath !== newPath) {
      if (!evidencePlans.has(oldPath)) evidencePlans.set(oldPath, new Map());
      evidencePlans.get(oldPath).set(newPath, { scope: schoolScope, path: newPath });
    }
    return {
      name: file?.name || 'Evidence file',
      path: newPath || oldPath,
      school_scope: schoolScope,
      contentType: file?.contentType || 'application/octet-stream',
    };
  });

  const patch = {};
  if (violation.school_scope !== schoolScope) patch.school_scope = schoolScope;
  if (JSON.stringify(evidenceUrls) !== JSON.stringify(normalizedEvidence)) patch.evidence_urls = normalizedEvidence;
  if (Object.keys(patch).length > 0) violationUpdates.push({ ref: violationDocument.ref, data: patch });
}

const totals = {
  students: studentsSnapshot.size,
  violations: violationsSnapshot.size,
  elementaryStudentCount,
  highSchoolStudentCount,
  sharedStudentCount,
  studentDocumentsToUpdate: studentUpdates.length,
  violationDocumentsToUpdate: violationUpdates.length,
  evidenceObjectsToMove: [...evidencePlans.values()].reduce((count, destinations) => count + destinations.size, 0),
  unlinkedViolationCount,
  unresolvedEvidenceReferenceCount,
};
console.log(JSON.stringify({ mode: applyChanges ? 'apply' : 'dry-run', projectId, totals }, null, 2));

if (!applyChanges) {
  console.log('No records or files changed. Re-run with --apply to apply this migration.');
  process.exit(0);
}

for (const [oldPath, destinations] of evidencePlans) {
  const source = bucket.file(oldPath);
  for (const destination of destinations.keys()) {
    await source.copy(bucket.file(destination));
    await bucket.file(destination).setMetadata({ metadata: { firebaseStorageDownloadTokens: '' } });
  }
}

for (const path of evidencePathsToRevoke) {
  await bucket.file(path).setMetadata({ metadata: { firebaseStorageDownloadTokens: '' } }).catch((error) => {
    console.warn(`Could not revoke legacy evidence download token for ${path}: ${error.message}`);
  });
}

await Promise.all([
  commitUpdates('Student documents', studentUpdates),
  commitUpdates('Violation documents', violationUpdates),
]);

await db.collection('rules').doc('school_scope_migration').set({
  completed_at: FieldValue.serverTimestamp(),
  project_id: projectId,
  totals,
});
console.log('School-scope backfill complete.');
