import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAnalytics, isSupported } from 'firebase/analytics';

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBqHoU7oZpNJozke0W54tzbazD6YUN338w",
  authDomain: "bib-journal.firebaseapp.com",
  projectId: "bib-journal",
  storageBucket: "bib-journal.firebasestorage.app",
  messagingSenderId: "539164090996",
  appId: "1:539164090996:web:efd765ec80e15c5fc5a721",
  measurementId: "G-LM8J09VL0G"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Initialize Analytics (only in browser environment)
let analytics = null;
if (typeof window !== 'undefined') {
  isSupported().then((supported) => {
    if (supported) {
      analytics = getAnalytics(app);
    }
  });
}

export { analytics };
export default app;

