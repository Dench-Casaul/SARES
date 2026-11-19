import { initializeApp } from "firebase/app";
import { browserSessionPersistence, initializeAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

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

// Session persistence: closing the tab or browser ends the sign-in, so a shared
// office computer does not stay signed in to SARES for the next person.
export const auth = initializeAuth(app, { persistence: browserSessionPersistence });
export const db = getFirestore(app);
export const storage = getStorage(app);