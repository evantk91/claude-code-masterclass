import { describe, it, expect } from "vitest"
import type { QueryDocumentSnapshot } from "firebase/firestore"

// component imports
import { HEIST_WINDOW_MS, heistDeadlineFrom, heistConverter } from "@/types/firestore"
import type { Heist } from "@/types/firestore"

const createdAt = new Date("2026-08-10T09:00:00.000Z")
const deadline = new Date("2026-08-12T09:00:00.000Z")

// stands in for the Timestamps Firestore actually hands back
function timestamp(date: Date) {
  return { toDate: () => date }
}

function snapshot(overrides: Record<string, unknown> = {}) {
  return {
    id: "heist-7",
    data: () => ({
      title: "Liberate the good stapler",
      description: "Third desk from the window. Do not be seen.",
      createdBy: "uid-1",
      createdByCodename: "SilentShadowFox",
      assignedTo: "uid-2",
      assignedToCodename: "QuietMidnightCrow",
      createdAt: timestamp(createdAt),
      deadline: timestamp(deadline),
      finalStatus: null,
      ...overrides,
    }),
  } as unknown as QueryDocumentSnapshot
}

describe("heistDeadlineFrom", () => {
  it("lands 48 hours past the given start", () => {
    expect(heistDeadlineFrom(createdAt)).toEqual(deadline)
  })

  it("leaves the start date it was handed alone", () => {
    const start = new Date(createdAt)

    heistDeadlineFrom(start)

    expect(start).toEqual(createdAt)
  })

  it("measures the window in 48 hours", () => {
    expect(HEIST_WINDOW_MS).toBe(48 * 60 * 60 * 1000)
  })
})

describe("heistConverter", () => {
  it("takes the id from the document rather than its fields", () => {
    expect(heistConverter.fromFirestore(snapshot()).id).toBe("heist-7")
  })

  it("turns the stored timestamps into dates", () => {
    const heist = heistConverter.fromFirestore(snapshot())

    expect(heist.createdAt).toEqual(createdAt)
    expect(heist.deadline).toEqual(deadline)
  })

  it("carries the rest of the fields through untouched", () => {
    const heist = heistConverter.fromFirestore(snapshot())

    expect(heist.title).toBe("Liberate the good stapler")
    expect(heist.createdBy).toBe("uid-1")
    expect(heist.createdByCodename).toBe("SilentShadowFox")
    expect(heist.assignedTo).toBe("uid-2")
    expect(heist.assignedToCodename).toBe("QuietMidnightCrow")
  })

  it("reads an unfinished heist as having no outcome", () => {
    expect(heistConverter.fromFirestore(snapshot()).finalStatus).toBeNull()
  })

  it("reads a settled heist's outcome", () => {
    const heist = heistConverter.fromFirestore(snapshot({ finalStatus: "success" }))

    expect(heist.finalStatus).toBe("success")
  })

  it("writes what it is given straight back out", () => {
    const update: Partial<Heist> = { finalStatus: "failure" }

    expect(heistConverter.toFirestore(update)).toEqual({ finalStatus: "failure" })
  })
})
