import { initializeApp, getApps } from "firebase/app";
import { getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "AIzaSyCzeafWn9NZQEBG84tAPNpOHKn2NdT5Xqw",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "shopping-list-e1248.firebaseapp.com",
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL ?? "https://shopping-list-e1248-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "shopping-list-e1248",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "shopping-list-e1248.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "572292954606",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? "1:572292954606:web:b0b01642709f008d4d76ff",
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
export const db = getDatabase(app);
