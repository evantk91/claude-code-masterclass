import { render, screen, waitFor, act, fireEvent } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

// component imports
import SignupForm from "@/components/SignupForm"

const { signUp, push } = vi.hoisted(() => ({ signUp: vi.fn(), push: vi.fn() }))

vi.mock("@/lib/auth/signUp", () => ({ signUp }))
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }))

// a promise the test resolves by hand, so a signup can be held mid-flight
function deferred() {
  let resolve!: () => void
  const promise = new Promise<void>((res) => {
    resolve = res
  })

  return { promise, resolve }
}

describe("SignupForm", () => {
  beforeEach(() => {
    vi.resetAllMocks()
    signUp.mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("renders labelled email and password fields", () => {
    render(<SignupForm />)

    expect(screen.getByRole("textbox", { name: /email/i })).toBeInTheDocument()
    expect(screen.getByLabelText("Password")).toBeInTheDocument()
  })

  it("renders a Sign Up submit button", () => {
    render(<SignupForm />)

    expect(screen.getByRole("button", { name: "Sign Up" })).toBeInTheDocument()
  })

  it("links across to the login page", () => {
    render(<SignupForm />)

    const switchLink = screen.getByRole("link", { name: /log in/i })
    expect(switchLink).toHaveAttribute("href", "/login")
  })

  it("masks the password field on initial render", () => {
    render(<SignupForm />)

    expect(screen.getByLabelText("Password")).toHaveAttribute("type", "password")
  })

  it("signs the user up with what they typed", async () => {
    const user = userEvent.setup()
    render(<SignupForm />)

    await user.type(screen.getByRole("textbox", { name: /email/i }), "rookie@heist.dev")
    await user.type(screen.getByLabelText("Password"), "letmein")
    await user.click(screen.getByRole("button", { name: "Sign Up" }))

    expect(signUp).toHaveBeenCalledWith("rookie@heist.dev", "letmein")
  })

  it("sends the new recruit on to their heists", async () => {
    const user = userEvent.setup()
    render(<SignupForm />)

    await user.type(screen.getByRole("textbox", { name: /email/i }), "rookie@heist.dev")
    await user.type(screen.getByLabelText("Password"), "letmein")
    await user.click(screen.getByRole("button", { name: "Sign Up" }))

    await waitFor(() => {
      expect(push).toHaveBeenCalledWith("/heists")
    })
  })

  it("shows why signup failed and stays on the page", async () => {
    const user = userEvent.setup()
    signUp.mockRejectedValue(new Error("That email is already registered. Try logging in instead."))
    render(<SignupForm />)

    await user.type(screen.getByRole("textbox", { name: /email/i }), "taken@heist.dev")
    await user.type(screen.getByLabelText("Password"), "letmein")
    await user.click(screen.getByRole("button", { name: "Sign Up" }))

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "That email is already registered. Try logging in instead.",
    )
    expect(push).not.toHaveBeenCalled()
  })

  it("lets the user try again after a failure", async () => {
    const user = userEvent.setup()
    signUp.mockRejectedValue(new Error("That email is already registered. Try logging in instead."))
    render(<SignupForm />)

    await user.click(screen.getByRole("button", { name: "Sign Up" }))

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Sign Up" })).toBeEnabled()
    })
  })

  it("disables the submit button while signing up", async () => {
    const user = userEvent.setup()
    const pending = deferred()
    signUp.mockReturnValue(pending.promise)
    render(<SignupForm />)

    await user.click(screen.getByRole("button", { name: "Sign Up" }))

    expect(screen.getByRole("button", { name: "Sign Up" })).toBeDisabled()

    await act(async () => {
      pending.resolve()
    })
  })

  it("ignores a second submit while one is already in flight", async () => {
    const user = userEvent.setup()
    const pending = deferred()
    signUp.mockReturnValue(pending.promise)
    const { container } = render(<SignupForm />)

    await user.click(screen.getByRole("button", { name: "Sign Up" }))
    expect(signUp).toHaveBeenCalledTimes(1)

    // submitting the form directly sidesteps the disabled button, leaving the
    // in-flight guard as the only thing standing in the way
    fireEvent.submit(container.querySelector("form")!)

    expect(signUp).toHaveBeenCalledTimes(1)

    await act(async () => {
      pending.resolve()
    })
  })
})
