import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, it, expect, vi, afterEach } from "vitest"

// component imports
import SignupForm from "@/components/SignupForm"

describe("SignupForm", () => {
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

  it("logs the entered email and password on submit", async () => {
    const user = userEvent.setup()
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {})
    render(<SignupForm />)

    await user.type(screen.getByRole("textbox", { name: /email/i }), "rookie@heist.dev")
    await user.type(screen.getByLabelText("Password"), "letmein")
    await user.click(screen.getByRole("button", { name: "Sign Up" }))

    expect(logSpy).toHaveBeenCalledWith({ email: "rookie@heist.dev", password: "letmein" })
  })

  it("still logs when both fields are empty", async () => {
    const user = userEvent.setup()
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {})
    render(<SignupForm />)

    await user.click(screen.getByRole("button", { name: "Sign Up" }))

    expect(logSpy).toHaveBeenCalledWith({ email: "", password: "" })
  })
})
