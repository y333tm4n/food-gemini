// lib/firebase.ts
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: "AIzaSyCCvXil173OcwOytK4zUQnPHoqcdzkfWAg",
    authDomain: "refresh-d6cdb.firebaseapp.com",
    databaseURL: "https://refresh-d6cdb-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "refresh-d6cdb",
    storageBucket: "refresh-d6cdb.firebasestorage.app",
    messagingSenderId: "50865555756",
    appId: "1:50865555756:web:c12bb96908c82e2a6a4489"
  };

// Initialize Firebase
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db };