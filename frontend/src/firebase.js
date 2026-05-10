import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

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

export const auth = getAuth(app);
export const db = getFirestore(app);