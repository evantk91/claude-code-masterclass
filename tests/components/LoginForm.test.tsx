import { render, screen, waitFor, act, fireEvent } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

// component imports
import LoginForm from "@/components/LoginForm"

const { signIn } = vi.hoisted(() => ({ signIn: vi.fn() }))

vi.mock("@/lib/auth/signIn", () => ({ signIn }))

// a promise the test resolves by hand, so a login can be held mid-flight
function deferred() {
  let resolve!: () => void
  const promise = new Promise<void>((res) => {
    resolve = res
  })

  return { promise, resolve }
}

describe("LoginForm", () => {
  beforeEach(() => {
    vi.resetAllMocks()
    signIn.mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("renders labelled email and password fields", () => {
    render(<LoginForm />)

    expect(screen.getByRole("textbox", { name: /email/i })).toBeInTheDocument()
    expect(screen.getByLabelText("Password")).toBeInTheDocument()
  })

  it("renders a Log In submit button", () => {
    render(<LoginForm />)

    expect(screen.getByRole("button", { name: "Log In" })).toBeInTheDocument()
  })

  it("links across to the signup page", () => {
    render(<LoginForm />)

    const switchLink = screen.getByRole("link", { name: /sign up/i })
    expect(switchLink).toHaveAttribute("href", "/signup")
  })

  it("masks the password field on initial render", () => {
    render(<LoginForm />)

    expect(screen.getByLabelText("Password")).toHaveAttribute("type", "password")
  })

  it("preserves the typed password when toggling visibility", async () => {
    const user = userEvent.setup()
    render(<LoginForm />)

    await user.type(screen.getByLabelText("Password"), "hunter2")
    await user.click(screen.getByRole("button", { name: /show password/i }))

    expect(screen.getByLabelText("Password")).toHaveValue("hunter2")
  })

  it("does not submit when the visibility toggle is clicked", async () => {
    const user = userEvent.setup()
    render(<LoginForm />)

    await user.click(screen.getByRole("button", { name: /show password/i }))
    await user.click(screen.getByRole("button", { name: /hide password/i }))

    expect(signIn).not.toHaveBeenCalled()
  })

  it("signs the user in with what they typed", async () => {
    const user = userEvent.setup()
    render(<LoginForm />)

    await user.type(screen.getByRole("textbox", { name: /email/i }), "ghost@heist.dev")
    await user.type(screen.getByLabelText("Password"), "hunter2")
    await user.click(screen.getByRole("button", { name: "Log In" }))

    expect(signIn).toHaveBeenCalledWith("ghost@heist.dev", "hunter2")
  })

  it("shows a success message and stays on the page", async () => {
    const user = userEvent.setup()
    render(<LoginForm />)

    await user.type(screen.getByRole("textbox", { name: /email/i }), "ghost@heist.dev")
    await user.type(screen.getByLabelText("Password"), "hunter2")
    await user.click(screen.getByRole("button", { name: "Log In" }))

    expect(await screen.findByRole("status")).toHaveTextContent(/logged in/i)
    expect(screen.getByRole("textbox", { name: /email/i })).toBeInTheDocument()
  })

  it("re-enables the submit button after a successful login", async () => {
    const user = userEvent.setup()
    render(<LoginForm />)

    await user.click(screen.getByRole("button", { name: "Log In" }))

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Log In" })).toBeEnabled()
    })
  })

  it("shows why login failed and shows no success message", async () => {
    const user = userEvent.setup()
    signIn.mockRejectedValue(new Error("That email or password doesn't match our records."))
    render(<LoginForm />)

    await user.type(screen.getByRole("textbox", { name: /email/i }), "ghost@heist.dev")
    await user.type(screen.getByLabelText("Password"), "wrong")
    await user.click(screen.getByRole("button", { name: "Log In" }))

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "That email or password doesn't match our records.",
    )
    expect(screen.queryByRole("status")).not.toBeInTheDocument()
  })

  it("lets the user try again after a failure", async () => {
    const user = userEvent.setup()
    signIn.mockRejectedValue(new Error("That email or password doesn't match our records."))
    render(<LoginForm />)

    await user.click(screen.getByRole("button", { name: "Log In" }))

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Log In" })).toBeEnabled()
    })
  })

  it("disables the submit button while logging in", async () => {
    const user = userEvent.setup()
    const pending = deferred()
    signIn.mockReturnValue(pending.promise)
    render(<LoginForm />)

    await user.click(screen.getByRole("button", { name: "Log In" }))

    expect(screen.getByRole("button", { name: "Log In" })).toBeDisabled()

    await act(async () => {
      pending.resolve()
    })
  })

  it("ignores a second submit while one is already in flight", async () => {
    const user = userEvent.setup()
    const pending = deferred()
    signIn.mockReturnValue(pending.promise)
    const { container } = render(<LoginForm />)

    await user.click(screen.getByRole("button", { name: "Log In" }))
    expect(signIn).toHaveBeenCalledTimes(1)

    // submitting the form directly sidesteps the disabled button, leaving the
    // in-flight guard as the only thing standing in the way
    fireEvent.submit(container.querySelector("form")!)

    expect(signIn).toHaveBeenCalledTimes(1)

    await act(async () => {
      pending.resolve()
    })
  })
})
