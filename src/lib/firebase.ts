// lib/firebase.ts
import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAja97vweI9uJLF1TX3MjRGyYYoA95qkVQ",
  authDomain: "my-vendas-22b4a.firebaseapp.com",
  projectId: "my-vendas-22b4a",
  storageBucket: "my-vendas-22b4a.firebasestorage.app",
  messagingSenderId: "158534826878",
  appId: "1:158534826878:web:2c39ec888106fe0e9a912f",
  measurementId: "G-LDBK2J0EV7",
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];

export const auth = getAuth(app); // para login, logout, etc.
export const googleProvider = new GoogleAuthProvider();
export default app;