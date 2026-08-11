import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

// component imports
import { listAssignableUsers } from "@/lib/users/listAssignableUsers"
import { db } from "@/lib/firebase/config"
import type { UserProfile } from "@/types/firestore"

const { collection, getDocs } = vi.hoisted(() => ({
  collection: vi.fn(),
  getDocs: vi.fn(),
}))

vi.mock("firebase/firestore", () => ({ collection, getDocs }))
vi.mock("@/lib/firebase/config", () => ({ auth: {}, db: {} }))

const usersRef = { path: "users" }

const crow = { id: "uid-2", codename: "QuietMidnightCrow" }
const fox = { id: "uid-3", codename: "SilentShadowFox" }
const ghost = { id: "uid-1", codename: "GhostQuietOwl" }

// stands in for the QuerySnapshot getDocs resolves with
function snapshotOf(profiles: UserProfile[]) {
  return { docs: profiles.map((profile) => ({ id: profile.id, data: () => profile })) }
}

describe("listAssignableUsers", () => {
  beforeEach(() => {
    vi.resetAllMocks()

    collection.mockReturnValue(usersRef)
    getDocs.mockResolvedValue(snapshotOf([ghost, crow, fox]))
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("reads the users collection", async () => {
    await listAssignableUsers("uid-1")

    expect(collection).toHaveBeenCalledWith(db, "users")
    expect(getDocs).toHaveBeenCalledWith(usersRef)
  })

  it("takes each id from the document rather than its fields", async () => {
    // the converter is what enforces this, so the read goes through it
    getDocs.mockResolvedValue({ docs: [{ id: "uid-2", data: () => ({ ...crow, id: "stale" }) }] })

    await expect(listAssignableUsers("uid-1")).resolves.toEqual([crow])
  })

  it("leaves out the person setting the heist up", async () => {
    const assignable = await listAssignableUsers("uid-1")

    expect(assignable).not.toContainEqual(ghost)
  })

  it("returns everyone else", async () => {
    const assignable = await listAssignableUsers("uid-1")

    expect(assignable).toEqual([crow, fox])
  })

  it("sorts the crew by codename", async () => {
    getDocs.mockResolvedValue(snapshotOf([fox, crow]))

    const assignable = await listAssignableUsers("uid-1")

    expect(assignable.map((member) => member.codename)).toEqual([
      "QuietMidnightCrow",
      "SilentShadowFox",
    ])
  })

  it("comes back empty when nobody else has signed up", async () => {
    getDocs.mockResolvedValue(snapshotOf([ghost]))

    await expect(listAssignableUsers("uid-1")).resolves.toEqual([])
  })

  it("explains a failed read rather than leaking the sdk error", async () => {
    getDocs.mockRejectedValue(new Error("permission denied"))

    await expect(listAssignableUsers("uid-1")).rejects.toThrow(
      "We couldn't load your crew. Please try again.",
    )
  })

  it("keeps the original failure as the cause", async () => {
    const cause = new Error("permission denied")
    getDocs.mockRejectedValue(cause)

    await expect(listAssignableUsers("uid-1")).rejects.toMatchObject({ cause })
  })
})
