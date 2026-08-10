import { signInWithEmailAndPassword } from "firebase/auth"

// firebase
import { auth } from "@/lib/firebase/config"

const SIGN_IN_FALLBACK_MESSAGE =
  "We couldn't log you in. Please check your details and try again."

// Modern Firebase Auth projects (email enumeration protection on, the
// default) collapse "no such user" and "wrong password" into one
// auth/invalid-credential code. Legacy per-case codes are kept as a
// fallback in case that protection is ever off for this project.
const SIGN_IN_ERROR_MESSAGES: Record<string, string> = {
  "auth/invalid-credential": "That email or password doesn't match our records.",
  "auth/user-not-found": "That email or password doesn't match our records.",
  "auth/wrong-password": "That email or password doesn't match our records.",
  "auth/invalid-email": "That doesn't look like a valid email address.",
  "auth/too-many-requests": "Too many attempts. Please wait a moment and try again.",
}

function messageForSignInError(error: unknown): string {
  const code =
    typeof error === "object" && error !== null && "code" in error ? String(error.code) : undefined

  return (code && SIGN_IN_ERROR_MESSAGES[code]) || SIGN_IN_FALLBACK_MESSAGE
}

export async function signIn(email: string, password: string): Promise<void> {
  try {
    await signInWithEmailAndPassword(auth, email, password)
  } catch (cause) {
    throw new Error(messageForSignInError(cause), { cause })
  }
}
