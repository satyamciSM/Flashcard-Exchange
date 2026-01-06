import { initializeApp } from "firebase/app"
import { getAuth } from "firebase/auth"
import { getFirestore } from "firebase/firestore"

const firebaseConfig = {
  apiKey: "AIzaSyADSVzI3zUWyJZCC1jvJZpKy6dxlxJSFsc",
  authDomain: "flashcard-exchange-340a4.firebaseapp.com",
  projectId: "flashcard-exchange-340a4",
  storageBucket: "flashcard-exchange-340a4.firebasestorage.app",
  messagingSenderId: "161145255164",
  appId: "1:161145255164:web:60566dab51c89358ab1379",
  measurementId: "G-QKWVJ7HXXD"
};

export const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)
