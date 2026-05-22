import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, writeBatch } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyCLvQhJUCzsaCqnjXCsHJpbuN2BO2ebjjg',
  authDomain: 'sares-system.firebaseapp.com',
  projectId: 'sares-system',
  storageBucket: 'sares-system.firebasestorage.app',
  messagingSenderId: '906502909085',
  appId: '1:906502909085:web:9662b6a8fc59798053f874',
  measurementId: 'G-DH0YPZ34EL',
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const deleteCollection = async (name) => {
  const snapshot = await getDocs(collection(db, name));
  if (snapshot.empty) {
    return 0;
  }

  const docs = snapshot.docs;
  let deleted = 0;

  for (let i = 0; i < docs.length; i += 450) {
    const chunk = docs.slice(i, i + 450);
    const batch = writeBatch(db);
    chunk.forEach((docSnap) => batch.delete(docSnap.ref));
    await batch.commit();
    deleted += chunk.length;
  }

  return deleted;
};

const main = async () => {
  const deletedStudents = await deleteCollection('students');
  const deletedViolations = await deleteCollection('violations');

  const remainingStudents = (await getDocs(collection(db, 'students'))).size;
  const remainingViolations = (await getDocs(collection(db, 'violations'))).size;

  console.log(JSON.stringify({
    deleted: {
      students: deletedStudents,
      violations: deletedViolations,
    },
    remaining: {
      students: remainingStudents,
      violations: remainingViolations,
    },
  }, null, 2));
};

main().catch((error) => {
  console.error('Cleanup failed:', error);
  process.exit(1);
});
