import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyBpUfZbENnD1VAmBzwmvA0t09MR9OHLonA",
  authDomain: "anjaneya-services.firebaseapp.com",
  projectId: "anjaneya-services",
  storageBucket: "anjaneya-services.firebasestorage.app",
  messagingSenderId: "334039193595",
  appId: "1:334039193595:web:716c1b9511ebd06abf1d5e",
  measurementId: "G-YFBBXGCEB9"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();
