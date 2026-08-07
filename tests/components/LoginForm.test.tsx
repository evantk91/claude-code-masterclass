import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, it, expect, vi, afterEach } from "vitest"

// component imports
import LoginForm from "@/components/LoginForm"

describe("LoginForm", () => {
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
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {})
    render(<LoginForm />)

    await user.click(screen.getByRole("button", { name: /show password/i }))
    await user.click(screen.getByRole("button", { name: /hide password/i }))

    expect(logSpy).not.toHaveBeenCalled()
  })

  it("logs the entered email and password on submit", async () => {
    const user = userEvent.setup()
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {})
    render(<LoginForm />)

    await user.type(screen.getByRole("textbox", { name: /email/i }), "ghost@heist.dev")
    await user.type(screen.getByLabelText("Password"), "hunter2")
    await user.click(screen.getByRole("button", { name: "Log In" }))

    expect(logSpy).toHaveBeenCalledWith({ email: "ghost@heist.dev", password: "hunter2" })
  })

  it("still logs when both fields are empty", async () => {
    const user = userEvent.setup()
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {})
    render(<LoginForm />)

    await user.click(screen.getByRole("button", { name: "Log In" }))

    expect(logSpy).toHaveBeenCalledWith({ email: "", password: "" })
  })
})
