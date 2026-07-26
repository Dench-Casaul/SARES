import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, writeBatch, query, limit } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyCLvQhJUCzsaCqnjXCsHJpbuN2BO2ebjjg",
  authDomain: "sares-system.firebaseapp.com",
  projectId: "sares-system",
  storageBucket: "sares-system.firebasestorage.app",
  messagingSenderId: "906502909085",
  appId: "1:906502909085:web:9662b6a8fc59798053f874",
  measurementId: "G-DH0YPZ34EL"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function countCollection(name) {
  const snapshot = await getDocs(collection(db, name));
  return snapshot.size;
}

async function deleteCollection(name, chunkSize = 200) {
  let deleted = 0;

  while (true) {
    const snapshot = await getDocs(query(collection(db, name), limit(chunkSize)));
    if (snapshot.empty) break;

    const batch = writeBatch(db);
    snapshot.docs.forEach((docSnap) => batch.delete(docSnap.ref));
    await batch.commit();
    deleted += snapshot.size;
  }

  return deleted;
}

async function run() {
  const targets = ["students", "violations"];

  console.log("Preparing cleanup for collections:", targets.join(", "));

  for (const target of targets) {
    const before = await countCollection(target);
    console.log(`[${target}] before: ${before}`);
    const removed = await deleteCollection(target);
    const after = await countCollection(target);
    console.log(`[${target}] removed: ${removed}`);
    console.log(`[${target}] after: ${after}`);
  }

  console.log("Cleanup complete.");
}

run().catch((error) => {
  console.error("Cleanup failed:", error);
  process.exitCode = 1;
});
