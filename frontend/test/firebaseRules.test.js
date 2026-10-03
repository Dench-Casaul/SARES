import test, { before, beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { collection, doc, getDoc, getDocs, query, setDoc, where, writeBatch } from 'firebase/firestore';
import { ref, uploadBytes } from 'firebase/storage';

const workspaceRoot = resolve(fileURLToPath(new URL('../../', import.meta.url)));
let testEnvironment;

function signedInAs(uid) {
  return testEnvironment.authenticatedContext(uid, { email: `${uid}@ows.edu.ph` });
}

before(async () => {
  testEnvironment = await initializeTestEnvironment({
    projectId: 'sares-role-rules-test',
    firestore: { rules: readFileSync(resolve(workspaceRoot, 'firestore.rules'), 'utf8') },
    storage: { rules: readFileSync(resolve(workspaceRoot, 'storage.rules'), 'utf8') },
  });
});

beforeEach(async () => {
  await testEnvironment.clearFirestore();
  await testEnvironment.clearStorage();
  await testEnvironment.withSecurityRulesDisabled(async (context) => {
    const firestore = context.firestore();
    await Promise.all([
      setDoc(doc(firestore, 'users', 'superadmin'), { role: 'superadmin', school_scope: 'all' }),
      setDoc(doc(firestore, 'users', 'elementary'), { role: 'counselor', school_scope: 'elementary' }),
      setDoc(doc(firestore, 'users', 'highschool'), { role: 'counselor', school_scope: 'high_school' }),
      setDoc(doc(firestore, 'students', 'elementary-student'), {
        year_level: '6th Grade', school_scope: 'elementary', student_number: 'E-1',
      }),
      setDoc(doc(firestore, 'students', 'highschool-student'), {
        year_level: '7th Grade', school_scope: 'high_school', student_number: 'H-1',
      }),
      setDoc(doc(firestore, 'students', 'shared-student'), {
        year_level: '', school_scope: 'shared', student_number: 'S-1',
      }),
      setDoc(doc(firestore, 'violations', 'elementary-violation'), {
        student_id: 'elementary-student', school_scope: 'elementary', offense_type: 'minor',
      }),
      setDoc(doc(firestore, 'violations', 'highschool-violation'), {
        student_id: 'highschool-student', school_scope: 'high_school', offense_type: 'major',
      }),
      setDoc(doc(firestore, 'violations', 'shared-violation'), {
        student_id: 'shared-student', school_scope: 'shared', offense_type: 'minor',
      }),
    ]);
  });
});

after(async () => {
  await testEnvironment?.cleanup();
});

test('counselor queries must constrain scope and return own plus shared records', async () => {
  const firestore = signedInAs('elementary').firestore();
  const scopedStudents = query(
    collection(firestore, 'students'),
    where('school_scope', 'in', ['elementary', 'shared'])
  );
  const scopedViolations = query(
    collection(firestore, 'violations'),
    where('school_scope', 'in', ['elementary', 'shared'])
  );

  const [students, violations] = await Promise.all([
    assertSucceeds(getDocs(scopedStudents)),
    assertSucceeds(getDocs(scopedViolations)),
  ]);
  assert.equal(students.size, 2);
  assert.equal(violations.size, 2);
  await assertFails(getDocs(collection(firestore, 'students')));
  await assertFails(getDocs(collection(firestore, 'violations')));
});

test('counselors cannot read another school level or promote their own profile', async () => {
  const firestore = signedInAs('elementary').firestore();
  await assertSucceeds(getDoc(doc(firestore, 'users', 'elementary')));
  await assertFails(getDoc(doc(firestore, 'users', 'highschool')));
  await assertSucceeds(getDoc(doc(firestore, 'students', 'elementary-student')));
  await assertFails(getDoc(doc(firestore, 'students', 'highschool-student')));
  await assertFails(setDoc(doc(firestore, 'users', 'elementary'), {
    role: 'superadmin', school_scope: 'all',
  }));
});

test('school transfers move a student and linked violation together', async () => {
  const firestore = signedInAs('superadmin').firestore();
  const batch = writeBatch(firestore);
  batch.update(doc(firestore, 'students', 'elementary-student'), {
    year_level: '7th Grade', school_scope: 'high_school',
  });
  batch.update(doc(firestore, 'violations', 'elementary-violation'), {
    school_scope: 'high_school',
  });
  await assertSucceeds(batch.commit());

  await assertSucceeds(getDoc(doc(firestore, 'students', 'elementary-student')));
  await assertFails(getDoc(doc(signedInAs('elementary').firestore(), 'students', 'elementary-student')));
});

test('unprovisioned school-domain users are denied', async () => {
  const firestore = signedInAs('not-provisioned').firestore();
  await assertFails(getDocs(collection(firestore, 'students')));
  await assertFails(getDoc(doc(firestore, 'users', 'not-provisioned')));
});

test('a separately provisioned superadmin UID keeps all-scope access', async () => {
  await testEnvironment.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), 'users', 'new-superadmin'), {
      role: 'superadmin',
      school_scope: 'all',
    });
  });

  const newSuperadmin = signedInAs('new-superadmin');
  const firestore = newSuperadmin.firestore();
  const [students, violations] = await Promise.all([
    assertSucceeds(getDocs(collection(firestore, 'students'))),
    assertSucceeds(getDocs(collection(firestore, 'violations'))),
  ]);

  assert.equal(students.size, 3);
  assert.equal(violations.size, 3);
  await assertSucceeds(uploadBytes(
    ref(newSuperadmin.storage(), 'evidence/legacy/new-superadmin.jpg'),
    new Uint8Array([1, 2, 3])
  ));
});

test('counselor writes must match their level and the linked student scope', async () => {
  const firestore = signedInAs('elementary').firestore();
  await assertSucceeds(setDoc(doc(firestore, 'students', 'elementary-new'), {
    year_level: '1st Grade', school_scope: 'elementary', student_number: 'E-2',
  }));
  await assertFails(setDoc(doc(firestore, 'students', 'highschool-new'), {
    year_level: '8th Grade', school_scope: 'high_school', student_number: 'H-2',
  }));
  await assertFails(setDoc(doc(firestore, 'students', 'spoofed-grade'), {
    year_level: '8th Grade', school_scope: 'elementary', student_number: 'X-1',
  }));
  await assertSucceeds(setDoc(doc(firestore, 'violations', 'elementary-new'), {
    student_id: 'elementary-student', school_scope: 'elementary', offense_type: 'minor',
  }));
  await assertFails(setDoc(doc(firestore, 'violations', 'cross-school'), {
    student_id: 'highschool-student', school_scope: 'high_school', offense_type: 'major',
  }));
});

test('superadmin can read all scopes while counselors can access shared evidence only', async () => {
  const superadmin = signedInAs('superadmin');
  const elementary = signedInAs('elementary');
  await assertSucceeds(getDocs(collection(superadmin.firestore(), 'students')));
  await assertSucceeds(uploadBytes(ref(elementary.storage(), 'evidence/elementary/batch-a/photo.jpg'), new Uint8Array([1, 2, 3])));
  await assertSucceeds(uploadBytes(ref(elementary.storage(), 'evidence/shared/batch-b/photo.jpg'), new Uint8Array([1, 2, 3])));
  await assertFails(uploadBytes(ref(elementary.storage(), 'evidence/high_school/batch-c/photo.jpg'), new Uint8Array([1, 2, 3])));
  await assertFails(uploadBytes(ref(elementary.storage(), 'evidence/legacy/photo.jpg'), new Uint8Array([1, 2, 3])));
  await assertSucceeds(uploadBytes(ref(superadmin.storage(), 'evidence/legacy/photo.jpg'), new Uint8Array([1, 2, 3])));
});
