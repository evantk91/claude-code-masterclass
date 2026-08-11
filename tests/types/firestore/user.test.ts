import { describe, it, expect } from "vitest"
import type { QueryDocumentSnapshot } from "firebase/firestore"

// component imports
import { userProfileConverter } from "@/types/firestore"
import type { UserProfile } from "@/types/firestore"

function snapshot(overrides: Record<string, unknown> = {}) {
  return {
    id: "uid-2",
    data: () => ({
      id: "uid-2",
      codename: "QuietMidnightCrow",
      ...overrides,
    }),
  } as unknown as QueryDocumentSnapshot
}

describe("userProfileConverter", () => {
  it("takes the id from the document rather than its fields", () => {
    // the stored id and the document id agree today, but the document wins
    expect(userProfileConverter.fromFirestore(snapshot({ id: "stale" })).id).toBe("uid-2")
  })

  it("carries the codename through untouched", () => {
    expect(userProfileConverter.fromFirestore(snapshot()).codename).toBe("QuietMidnightCrow")
  })

  it("writes what it is given straight back out", () => {
    const update: Partial<UserProfile> = { codename: "SilentShadowFox" }

    expect(userProfileConverter.toFirestore(update)).toEqual({ codename: "SilentShadowFox" })
  })
})
