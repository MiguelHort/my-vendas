import { auth } from "@/lib/firebase";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
} from "firebase/auth";

export async function loginWithEmail(email: string, password: string) {
  return signInWithEmailAndPassword(auth, email, password);
}

export async function registerWithEmail(
  email: string,
  password: string,
  name: string
) {
  const result = await createUserWithEmailAndPassword(auth, email, password);
  if (name) {
    await updateProfile(result.user, { displayName: name });
  }
  return result;
}
