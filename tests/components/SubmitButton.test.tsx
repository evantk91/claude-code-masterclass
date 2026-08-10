import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, it, expect, vi } from "vitest"

// component imports
import SubmitButton from "@/components/SubmitButton"

describe("SubmitButton", () => {
  it("renders its children as the button label", () => {
    render(<SubmitButton>Log In</SubmitButton>)

    expect(screen.getByRole("button", { name: "Log In" })).toBeInTheDocument()
  })

  it("is a submit button", () => {
    render(<SubmitButton>Log In</SubmitButton>)

    expect(screen.getByRole("button", { name: "Log In" })).toHaveAttribute("type", "submit")
  })

  it("submits the surrounding form when clicked", async () => {
    const user = userEvent.setup()
    const handleSubmit = vi.fn((event) => event.preventDefault())
    render(
      <form onSubmit={handleSubmit}>
        <SubmitButton>Log In</SubmitButton>
      </form>,
    )

    await user.click(screen.getByRole("button", { name: "Log In" }))

    expect(handleSubmit).toHaveBeenCalledTimes(1)
  })

  it("is enabled unless told otherwise", () => {
    render(<SubmitButton>Log In</SubmitButton>)

    expect(screen.getByRole("button", { name: "Log In" })).toBeEnabled()
  })

  it("is disabled when asked to be", () => {
    render(<SubmitButton disabled>Log In</SubmitButton>)

    expect(screen.getByRole("button", { name: "Log In" })).toBeDisabled()
  })

  it("cannot submit the surrounding form while disabled", async () => {
    const user = userEvent.setup()
    const handleSubmit = vi.fn((event) => event.preventDefault())
    render(
      <form onSubmit={handleSubmit}>
        <SubmitButton disabled>Log In</SubmitButton>
      </form>,
    )

    await user.click(screen.getByRole("button", { name: "Log In" }))

    expect(handleSubmit).not.toHaveBeenCalled()
  })
})
