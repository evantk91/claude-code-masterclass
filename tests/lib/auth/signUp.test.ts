import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

// component imports
import { signUp } from "@/lib/auth/signUp"
import { auth, db } from "@/lib/firebase/config"

const { createUserWithEmailAndPassword, updateProfile, doc, setDoc, generateCodename } = vi.hoisted(
  () => ({
    createUserWithEmailAndPassword: vi.fn(),
    updateProfile: vi.fn(),
    doc: vi.fn(),
    setDoc: vi.fn(),
    generateCodename: vi.fn(),
  }),
)

vi.mock("firebase/auth", () => ({ createUserWithEmailAndPassword, updateProfile }))
vi.mock("firebase/firestore", () => ({ doc, setDoc }))
vi.mock("@/lib/firebase/config", () => ({ auth: {}, db: {} }))
vi.mock("@/lib/codename/generateCodename", () => ({ generateCodename }))

const newUser = { uid: "heist-7" }
const userDoc = { path: "users/heist-7" }
const codename = "SilentShadowFox"

// stands in for the FirebaseError the SDK rejects with — what matters is the code
function firebaseError(code: string) {
  return Object.assign(new Error(code), { code })
}

describe("signUp", () => {
  beforeEach(() => {
    vi.resetAllMocks()

    createUserWithEmailAndPassword.mockResolvedValue({ user: newUser })
    updateProfile.mockResolvedValue(undefined)
    doc.mockReturnValue(userDoc)
    setDoc.mockResolvedValue(undefined)
    generateCodename.mockReturnValue(codename)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("creates the account with the given email and password", async () => {
    await signUp("rookie@heist.dev", "letmein")

    expect(createUserWithEmailAndPassword).toHaveBeenCalledWith(auth, "rookie@heist.dev", "letmein")
  })

  it("sets the generated codename as the display name", async () => {
    await signUp("rookie@heist.dev", "letmein")

    expect(updateProfile).toHaveBeenCalledWith(newUser, { displayName: codename })
  })

  it("stores the codename against the user's id in the users collection", async () => {
    await signUp("rookie@heist.dev", "letmein")

    expect(doc).toHaveBeenCalledWith(db, "users", newUser.uid)
    expect(setDoc).toHaveBeenCalledWith(userDoc, { id: newUser.uid, codename })
  })

  it("never writes the email to firestore", async () => {
    await signUp("rookie@heist.dev", "letmein")

    expect(setDoc.mock.calls[0][1]).not.toHaveProperty("email")
  })

  it("resolves once the account, profile and document are all in place", async () => {
    await expect(signUp("rookie@heist.dev", "letmein")).resolves.toBeUndefined()
  })

  it("explains an email that is already registered", async () => {
    createUserWithEmailAndPassword.mockRejectedValue(firebaseError("auth/email-already-in-use"))

    await expect(signUp("taken@heist.dev", "letmein")).rejects.toThrow(
      "That email is already registered. Try logging in instead.",
    )
  })

  it("explains a password firebase considers too weak", async () => {
    createUserWithEmailAndPassword.mockRejectedValue(firebaseError("auth/weak-password"))

    await expect(signUp("rookie@heist.dev", "123")).rejects.toThrow(
      "Your password must be at least 6 characters.",
    )
  })

  it("explains a malformed email", async () => {
    createUserWithEmailAndPassword.mockRejectedValue(firebaseError("auth/invalid-email"))

    await expect(signUp("nope", "letmein")).rejects.toThrow(
      "That doesn't look like a valid email address.",
    )
  })

  it("falls back to a generic message for an unrecognised failure", async () => {
    createUserWithEmailAndPassword.mockRejectedValue(new Error("network request failed"))

    await expect(signUp("rookie@heist.dev", "letmein")).rejects.toThrow(
      "We couldn't create your account. Please check your details and try again.",
    )
  })

  it("leaves the profile and document alone when the account is never created", async () => {
    createUserWithEmailAndPassword.mockRejectedValue(firebaseError("auth/email-already-in-use"))

    await expect(signUp("taken@heist.dev", "letmein")).rejects.toThrow()

    expect(updateProfile).not.toHaveBeenCalled()
    expect(setDoc).not.toHaveBeenCalled()
  })

  it("reports a half-finished signup when the display name cannot be set", async () => {
    updateProfile.mockRejectedValue(new Error("profile update failed"))

    await expect(signUp("rookie@heist.dev", "letmein")).rejects.toThrow(
      "Your account was created, but we couldn't finish setting up your profile.",
    )

    // the write is sequential, so a failed profile update never reaches firestore
    expect(setDoc).not.toHaveBeenCalled()
  })

  it("reports a half-finished signup when the document cannot be written", async () => {
    setDoc.mockRejectedValue(new Error("permission denied"))

    await expect(signUp("rookie@heist.dev", "letmein")).rejects.toThrow(
      "Your account was created, but we couldn't finish setting up your profile.",
    )
  })
})
