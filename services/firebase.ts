import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyAyYbQ8F8YfHF3Uyta7Mh5uXHnbVW5f6_c",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "rapidingodelivery-f4c7b.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "rapidingodelivery-f4c7b",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "rapidingodelivery-f4c7b.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "916799303545",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:916799303545:android:90ade000258322308149a8"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
