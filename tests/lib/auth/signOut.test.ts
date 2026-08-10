import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

// component imports
import { signOut } from "@/lib/auth/signOut"
import { auth } from "@/lib/firebase/config"

// named for the SDK export it stands in for, so the two signOuts stay apart
const { firebaseSignOut } = vi.hoisted(() => ({ firebaseSignOut: vi.fn() }))

vi.mock("firebase/auth", () => ({ signOut: firebaseSignOut }))
vi.mock("@/lib/firebase/config", () => ({ auth: {} }))

describe("signOut", () => {
  beforeEach(() => {
    vi.resetAllMocks()

    firebaseSignOut.mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("signs out of the shared auth instance", async () => {
    await signOut()

    expect(firebaseSignOut).toHaveBeenCalledWith(auth)
  })

  it("resolves once firebase has signed the user out", async () => {
    await expect(signOut()).resolves.toBeUndefined()
  })

  it("passes a failure straight through to the caller", async () => {
    firebaseSignOut.mockRejectedValue(new Error("network request failed"))

    await expect(signOut()).rejects.toThrow("network request failed")
  })
})
