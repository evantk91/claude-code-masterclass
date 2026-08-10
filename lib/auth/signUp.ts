import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth"
import { doc, setDoc } from "firebase/firestore"

// firebase
import { auth, db } from "@/lib/firebase/config"
import { generateCodename } from "@/lib/codename/generateCodename"

const CREATION_FALLBACK_MESSAGE =
  "We couldn't create your account. Please check your details and try again."

// The handful of Firebase codes a signup form realistically hits. Anything
// else falls back to the generic message rather than leaking SDK wording.
const CREATION_ERROR_MESSAGES: Record<string, string> = {
  "auth/email-already-in-use": "That email is already registered. Try logging in instead.",
  "auth/weak-password": "Your password must be at least 6 characters.",
  "auth/invalid-email": "That doesn't look like a valid email address.",
}

// Once the account exists, saying "signup failed" would be a lie — the user
// cannot re-register that email. Name the half-finished state instead.
const PROFILE_FAILURE_MESSAGE =
  "Your account was created, but we couldn't finish setting up your profile. Please try again or contact support."

function messageForCreationError(error: unknown): string {
  const code =
    typeof error === "object" && error !== null && "code" in error ? String(error.code) : undefined

  return (code && CREATION_ERROR_MESSAGES[code]) || CREATION_FALLBACK_MESSAGE
}

export async function signUp(email: string, password: string): Promise<void> {
  let user

  try {
    const credential = await createUserWithEmailAndPassword(auth, email, password)
    user = credential.user
  } catch (cause) {
    throw new Error(messageForCreationError(cause), { cause })
  }

  const codename = generateCodename()

  try {
    await updateProfile(user, { displayName: codename })
    // keyed by uid, and deliberately without the email — the users collection
    // stores only what other players are allowed to see
    await setDoc(doc(db, "users", user.uid), { id: user.uid, codename })
  } catch (cause) {
    throw new Error(PROFILE_FAILURE_MESSAGE, { cause })
  }
}
