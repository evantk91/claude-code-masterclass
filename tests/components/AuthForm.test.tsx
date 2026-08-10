import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, it, expect, vi } from "vitest"

// component imports
import AuthForm from "@/components/AuthForm"

const shellProps = {
  submitLabel: "Log In",
  switchPrompt: "Don't have an account?",
  switchHref: "/signup",
  switchLabel: "Sign up",
  onSubmit: () => {},
}

describe("AuthForm", () => {
  it("renders its children as the form fields", () => {
    render(
      <AuthForm {...shellProps}>
        <input aria-label="Codename" />
      </AuthForm>,
    )

    expect(screen.getByRole("textbox", { name: "Codename" })).toBeInTheDocument()
  })

  it("renders the given submit label", () => {
    render(<AuthForm {...shellProps}>{null}</AuthForm>)

    expect(screen.getByRole("button", { name: "Log In" })).toBeInTheDocument()
  })

  it("renders the cross-link with the given href and label", () => {
    render(<AuthForm {...shellProps}>{null}</AuthForm>)

    const switchLink = screen.getByRole("link", { name: "Sign up" })
    expect(switchLink).toHaveAttribute("href", "/signup")
  })

  it("calls onSubmit when the submit button is clicked", async () => {
    const user = userEvent.setup()
    const handleSubmit = vi.fn((event) => event.preventDefault())
    render(<AuthForm {...shellProps} onSubmit={handleSubmit}>{null}</AuthForm>)

    await user.click(screen.getByRole("button", { name: "Log In" }))

    expect(handleSubmit).toHaveBeenCalledTimes(1)
  })

  it("shows the error it is given", () => {
    render(<AuthForm {...shellProps} error="That email is already registered.">{null}</AuthForm>)

    expect(screen.getByRole("alert")).toHaveTextContent("That email is already registered.")
  })

  it("shows no error by default", () => {
    render(<AuthForm {...shellProps}>{null}</AuthForm>)

    expect(screen.queryByRole("alert")).not.toBeInTheDocument()
  })

  it("disables the submit button while submitting", () => {
    render(<AuthForm {...shellProps} submitting>{null}</AuthForm>)

    expect(screen.getByRole("button", { name: "Log In" })).toBeDisabled()
  })

  it("leaves the submit button enabled when not submitting", () => {
    render(<AuthForm {...shellProps}>{null}</AuthForm>)

    expect(screen.getByRole("button", { name: "Log In" })).toBeEnabled()
  })
})
