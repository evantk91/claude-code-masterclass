import { renderHook, act } from "@testing-library/react"
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

// component imports
import useHeists from "@/hooks/useHeists"
import { db } from "@/lib/firebase/config"

const { collection, onSnapshot, query, where, useUser } = vi.hoisted(() => ({
  collection: vi.fn(),
  onSnapshot: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  useUser: vi.fn(),
}))

vi.mock("firebase/firestore", () => ({ collection, onSnapshot, query, where }))
vi.mock("@/lib/firebase/config", () => ({ auth: {}, db: {} }))
vi.mock("@/hooks/useUser", () => ({ default: useUser }))

const heistsRef = { path: "heists" }
const scopedQuery = { scoped: true }
const whereClause = { clause: true }

const ghost = { uid: "uid-1", email: "ghost@heist.dev", displayName: "Ghost" }
const mole = { uid: "uid-2", email: "mole@heist.dev", displayName: "Mole" }

const now = new Date("2026-08-11T12:00:00.000Z")
const future = new Date("2026-08-12T12:00:00.000Z")
const past = new Date("2026-08-10T12:00:00.000Z")

// shaped the way heistConverter.fromFirestore reads it: an id, plus data()
// handing back firestore Timestamps that it calls .toDate() on
function heistDoc(id: string, fields: Record<string, unknown>) {
  return {
    id,
    data: () => ({
      title: `Heist ${id}`,
      description: "Third desk from the window.",
      createdBy: "uid-1",
      createdByCodename: "Ghost",
      assignedTo: "uid-2",
      assignedToCodename: "Mole",
      finalStatus: null,
      createdAt: { toDate: () => past },
      ...fields,
    }),
  }
}

// drives the listener firestore was handed, standing in for a real snapshot
function emitSnapshot(docs: unknown[]) {
  const listener = onSnapshot.mock.calls[0][1]

  act(() => {
    listener({ docs })
  })
}

describe("useHeists", () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.useFakeTimers()
    vi.setSystemTime(now)

    collection.mockReturnValue(heistsRef)
    where.mockReturnValue(whereClause)
    query.mockReturnValue(scopedQuery)
    onSnapshot.mockReturnValue(vi.fn())
    useUser.mockReturnValue({ user: ghost, loading: false })
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
  })

  it("asks firestore only for the heists pinned on you in active mode", () => {
    renderHook(() => useHeists("active"))

    expect(collection).toHaveBeenCalledWith(db, "heists")
    expect(where).toHaveBeenCalledWith("assignedTo", "==", "uid-1")
    expect(onSnapshot).toHaveBeenCalledWith(scopedQuery, expect.any(Function))
  })

  it("drops heists whose window has already closed in active mode", () => {
    const { result } = renderHook(() => useHeists("active"))

    emitSnapshot([
      heistDoc("open", { deadline: { toDate: () => future } }),
      heistDoc("closed", { deadline: { toDate: () => past } }),
    ])

    expect(result.current.map((heist) => heist.id)).toEqual(["open"])
  })

  it("asks firestore only for the heists you set up in assigned mode", () => {
    renderHook(() => useHeists("assigned"))

    expect(where).toHaveBeenCalledWith("createdBy", "==", "uid-1")
    expect(onSnapshot).toHaveBeenCalledWith(scopedQuery, expect.any(Function))
  })

  it("drops heists whose window has already closed in assigned mode", () => {
    const { result } = renderHook(() => useHeists("assigned"))

    emitSnapshot([
      heistDoc("open", { deadline: { toDate: () => future } }),
      heistDoc("closed", { deadline: { toDate: () => past } }),
    ])

    expect(result.current.map((heist) => heist.id)).toEqual(["open"])
  })

  it("asks firestore only for heists that reached an outcome in expired mode", () => {
    renderHook(() => useHeists("expired"))

    // the outcome narrows it; nothing ties it to whoever is signed in
    expect(where).toHaveBeenCalledExactlyOnceWith("finalStatus", "in", ["success", "failure"])
    expect(onSnapshot).toHaveBeenCalledWith(scopedQuery, expect.any(Function))
  })

  it("drops heists whose window is still open in expired mode", () => {
    const { result } = renderHook(() => useHeists("expired"))

    emitSnapshot([
      heistDoc("ended", { deadline: { toDate: () => past }, finalStatus: "success" }),
      heistDoc("still-open", { deadline: { toDate: () => future }, finalStatus: "failure" }),
    ])

    expect(result.current.map((heist) => heist.id)).toEqual(["ended"])
  })

  it("returns expired heists regardless of who they belong to", () => {
    const { result } = renderHook(() => useHeists("expired"))

    emitSnapshot([
      heistDoc("someone-elses", {
        createdBy: "uid-9",
        assignedTo: "uid-8",
        deadline: { toDate: () => past },
        finalStatus: "failure",
      }),
    ])

    expect(result.current.map((heist) => heist.id)).toEqual(["someone-elses"])
  })

  it("returns nothing and opens no listener for the uid-scoped modes when signed out", () => {
    useUser.mockReturnValue({ user: null, loading: false })

    const active = renderHook(() => useHeists("active"))
    const assigned = renderHook(() => useHeists("assigned"))

    expect(active.result.current).toEqual([])
    expect(assigned.result.current).toEqual([])
    expect(onSnapshot).not.toHaveBeenCalled()
  })

  it("still lists expired heists when nobody is signed in", () => {
    useUser.mockReturnValue({ user: null, loading: false })

    renderHook(() => useHeists("expired"))

    expect(onSnapshot).toHaveBeenCalledWith(scopedQuery, expect.any(Function))
  })

  it("counts a deadline landing exactly now as neither open nor expired", () => {
    const onTheDot = { deadline: { toDate: () => now }, finalStatus: "success" }

    const active = renderHook(() => useHeists("active"))
    emitSnapshot([heistDoc("on-the-dot", onTheDot)])
    expect(active.result.current).toEqual([])

    onSnapshot.mockClear()

    const expired = renderHook(() => useHeists("expired"))
    emitSnapshot([heistDoc("on-the-dot", onTheDot)])
    expect(expired.result.current).toEqual([])
  })

  it("stops handing back one user's heists the moment someone else signs in", () => {
    const { result, rerender } = renderHook(() => useHeists("active"))

    emitSnapshot([heistDoc("ghosts", { deadline: { toDate: () => future } })])
    expect(result.current.map((heist) => heist.id)).toEqual(["ghosts"])

    // the new listener has not reported yet — the old rows must not stand in
    useUser.mockReturnValue({ user: mole, loading: false })
    rerender()

    expect(result.current).toEqual([])
  })

  it("clears the heists it was showing once the user signs out", () => {
    const { result, rerender } = renderHook(() => useHeists("active"))

    emitSnapshot([heistDoc("ghosts", { deadline: { toDate: () => future } })])
    expect(result.current).toHaveLength(1)

    useUser.mockReturnValue({ user: null, loading: false })
    rerender()

    expect(result.current).toEqual([])
  })

  it("detaches the listener when the caller goes away", () => {
    const unsubscribe = vi.fn()
    onSnapshot.mockReturnValue(unsubscribe)

    const { unmount } = renderHook(() => useHeists("active"))
    expect(unsubscribe).not.toHaveBeenCalled()

    unmount()

    expect(unsubscribe).toHaveBeenCalledTimes(1)
  })
})
