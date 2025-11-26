import { auth, googleProvider } from "@/lib/firebase";
import { signInWithPopup } from "firebase/auth";

export async function loginWithGoogle() {
  return signInWithPopup(auth, googleProvider);
}