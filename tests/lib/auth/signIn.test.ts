import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

// component imports
import { signIn } from "@/lib/auth/signIn"
import { auth } from "@/lib/firebase/config"

const { signInWithEmailAndPassword } = vi.hoisted(() => ({
  signInWithEmailAndPassword: vi.fn(),
}))

vi.mock("firebase/auth", () => ({ signInWithEmailAndPassword }))
vi.mock("@/lib/firebase/config", () => ({ auth: {} }))

// stands in for the FirebaseError the SDK rejects with — what matters is the code
function firebaseError(code: string) {
  return Object.assign(new Error(code), { code })
}

describe("signIn", () => {
  beforeEach(() => {
    vi.resetAllMocks()

    signInWithEmailAndPassword.mockResolvedValue({ user: { uid: "heist-7" } })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("signs in with the given email and password", async () => {
    await signIn("rookie@heist.dev", "letmein")

    expect(signInWithEmailAndPassword).toHaveBeenCalledWith(auth, "rookie@heist.dev", "letmein")
  })

  it("resolves once the sign-in succeeds", async () => {
    await expect(signIn("rookie@heist.dev", "letmein")).resolves.toBeUndefined()
  })

  it("explains a credential that doesn't match an account", async () => {
    signInWithEmailAndPassword.mockRejectedValue(firebaseError("auth/invalid-credential"))

    await expect(signIn("rookie@heist.dev", "wrong")).rejects.toThrow(
      "That email or password doesn't match our records.",
    )
  })

  it("explains a legacy user-not-found code the same way", async () => {
    signInWithEmailAndPassword.mockRejectedValue(firebaseError("auth/user-not-found"))

    await expect(signIn("nobody@heist.dev", "letmein")).rejects.toThrow(
      "That email or password doesn't match our records.",
    )
  })

  it("explains a legacy wrong-password code the same way", async () => {
    signInWithEmailAndPassword.mockRejectedValue(firebaseError("auth/wrong-password"))

    await expect(signIn("rookie@heist.dev", "wrong")).rejects.toThrow(
      "That email or password doesn't match our records.",
    )
  })

  it("explains a malformed email", async () => {
    signInWithEmailAndPassword.mockRejectedValue(firebaseError("auth/invalid-email"))

    await expect(signIn("nope", "letmein")).rejects.toThrow(
      "That doesn't look like a valid email address.",
    )
  })

  it("explains too many failed attempts", async () => {
    signInWithEmailAndPassword.mockRejectedValue(firebaseError("auth/too-many-requests"))

    await expect(signIn("rookie@heist.dev", "letmein")).rejects.toThrow(
      "Too many attempts. Please wait a moment and try again.",
    )
  })

  it("falls back to a generic message for an unrecognised failure", async () => {
    signInWithEmailAndPassword.mockRejectedValue(new Error("network request failed"))

    await expect(signIn("rookie@heist.dev", "letmein")).rejects.toThrow(
      "We couldn't log you in. Please check your details and try again.",
    )
  })
})
