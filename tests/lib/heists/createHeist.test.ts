import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

// component imports
import { createHeist } from "@/lib/heists/createHeist"
import { db } from "@/lib/firebase/config"

const { addDoc, collection, serverTimestamp } = vi.hoisted(() => ({
  addDoc: vi.fn(),
  collection: vi.fn(),
  serverTimestamp: vi.fn(),
}))

vi.mock("firebase/firestore", () => ({ addDoc, collection, serverTimestamp }))
vi.mock("@/lib/firebase/config", () => ({ auth: {}, db: {} }))

const heistsRef = { path: "heists" }
// stands in for the sentinel serverTimestamp() hands back
const timestampSentinel = { sentinel: "serverTimestamp" }

const now = new Date("2026-08-10T09:00:00.000Z")
const deadline = new Date("2026-08-12T09:00:00.000Z")

const heist = {
  title: "Liberate the good stapler",
  description: "Third desk from the window. Do not be seen.",
  createdBy: "uid-1",
  createdByCodename: "GhostQuietOwl",
  assignedTo: "uid-2",
  assignedToCodename: "QuietMidnightCrow",
}

describe("createHeist", () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.useFakeTimers()
    vi.setSystemTime(now)

    collection.mockReturnValue(heistsRef)
    serverTimestamp.mockReturnValue(timestampSentinel)
    addDoc.mockResolvedValue({ id: "heist-7" })
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it("adds the heist to the heists collection", async () => {
    await createHeist(heist)

    expect(collection).toHaveBeenCalledWith(db, "heists")
    expect(addDoc).toHaveBeenCalledWith(heistsRef, expect.any(Object))
  })

  it("writes what the form collected", async () => {
    await createHeist(heist)

    expect(addDoc.mock.calls[0][1]).toMatchObject(heist)
  })

  it("leaves the creation time to firestore's clock", async () => {
    await createHeist(heist)

    expect(addDoc.mock.calls[0][1].createdAt).toBe(timestampSentinel)
  })

  it("gives the heist 48 hours to be pulled off", async () => {
    await createHeist(heist)

    expect(addDoc.mock.calls[0][1].deadline).toEqual(deadline)
  })

  it("starts the heist with no outcome", async () => {
    await createHeist(heist)

    expect(addDoc.mock.calls[0][1].finalStatus).toBeNull()
  })

  it("never lets the caller set the deadline or the outcome", async () => {
    // the extra fields are ignored: the document is built here, not passed through
    await createHeist({ ...heist, deadline: "whenever", finalStatus: "success" } as never)

    expect(addDoc.mock.calls[0][1].deadline).toEqual(deadline)
    expect(addDoc.mock.calls[0][1].finalStatus).toBeNull()
  })

  it("explains a failed write rather than leaking the sdk error", async () => {
    addDoc.mockRejectedValue(new Error("permission denied"))

    await expect(createHeist(heist)).rejects.toThrow(
      "We couldn't set up that heist. Please try again.",
    )
  })

  it("keeps the original failure as the cause", async () => {
    const cause = new Error("permission denied")
    addDoc.mockRejectedValue(cause)

    await expect(createHeist(heist)).rejects.toMatchObject({ cause })
  })
})
