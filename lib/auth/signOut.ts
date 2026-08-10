import { signOut as firebaseSignOut } from "firebase/auth"

// firebase
import { auth } from "@/lib/firebase/config"

// Deliberately message-free, unlike signUp: the navbar has nowhere to show a
// failure, so the rejection travels untouched to the caller, which logs it.
export async function signOut(): Promise<void> {
  await firebaseSignOut(auth)
}
