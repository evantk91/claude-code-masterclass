import { render, renderHook, screen, act } from "@testing-library/react"
import { describe, it, expect, vi, beforeEach } from "vitest"
import { useContext } from "react"

// component imports
import AuthProvider from "@/components/AuthProvider"
import { AuthContext } from "@/lib/auth/AuthContext"

const { onAuthStateChanged } = vi.hoisted(() => ({ onAuthStateChanged: vi.fn() }))

vi.mock("firebase/auth", () => ({ onAuthStateChanged }))
vi.mock("@/lib/firebase/config", () => ({ auth: {} }))

// photoURL is here on purpose: the provider should drop everything it isn't asked for
const firebaseUser = {
  uid: "heist-1",
  email: "ghost@heist.dev",
  displayName: "Ghost",
  photoURL: "https://heist.dev/ghost.png",
}

// reads what the provider publishes, without going through useUser
function renderContext() {
  return renderHook(() => useContext(AuthContext), { wrapper: AuthProvider })
}

// drives the observer Firebase was handed, standing in for a real auth event
function emitAuthState(user: unknown) {
  const observer = onAuthStateChanged.mock.calls[0][1]

  act(() => {
    observer(user)
  })
}

describe("AuthProvider", () => {
  let unsubscribe: ReturnType<typeof vi.fn>

  beforeEach(() => {
    unsubscribe = vi.fn()
    onAuthStateChanged.mockReset()
    onAuthStateChanged.mockReturnValue(unsubscribe)
  })

  it("renders its children", () => {
    render(<AuthProvider><p>the vault</p></AuthProvider>)

    expect(screen.getByText("the vault")).toBeInTheDocument()
  })

  it("subscribes to auth state exactly once", () => {
    renderContext()

    expect(onAuthStateChanged).toHaveBeenCalledTimes(1)
  })

  it("reports no user and still loading until firebase answers", () => {
    const { result } = renderContext()

    expect(result.current).toEqual({ user: null, loading: true })
  })

  it("resolves to a signed-out state when firebase reports no user", () => {
    const { result } = renderContext()

    emitAuthState(null)

    expect(result.current).toEqual({ user: null, loading: false })
  })

  it("narrows the firebase user down to uid, email and displayName", () => {
    const { result } = renderContext()

    emitAuthState(firebaseUser)

    expect(result.current).toEqual({
      user: { uid: "heist-1", email: "ghost@heist.dev", displayName: "Ghost" },
      loading: false,
    })
  })

  it("stays resolved once a later auth change comes through", () => {
    const { result } = renderContext()

    emitAuthState(firebaseUser)
    emitAuthState(null)

    expect(result.current).toEqual({ user: null, loading: false })
  })

  it("unsubscribes when it unmounts", () => {
    const { unmount } = renderContext()
    expect(unsubscribe).not.toHaveBeenCalled()

    unmount()

    expect(unsubscribe).toHaveBeenCalledTimes(1)
  })
})
