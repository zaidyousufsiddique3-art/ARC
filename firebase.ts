import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

export const firebaseConfig = {
  apiKey: "AIzaSyBOBfBVahELD-oLdINEpOK1FBD68aGNTJw",
  authDomain: "ar-consultants-90ec8.firebaseapp.com",
  projectId: "ar-consultants-90ec8",
  storageBucket: "ar-consultants-90ec8.firebasestorage.app",
  messagingSenderId: "898226681234",
  appId: "1:898226681234:web:f5736c098ca29200d2fd4b",
  measurementId: "G-Q4X3RTD7X8"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();