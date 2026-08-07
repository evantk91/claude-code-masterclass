import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, it, expect } from "vitest"

// component imports
import PasswordField from "@/components/PasswordField"

describe("PasswordField", () => {
  it("masks the value on initial render", () => {
    render(<PasswordField label="Password" name="password" value="" onChange={() => {}} />)

    expect(screen.getByLabelText("Password")).toHaveAttribute("type", "password")
  })

  it("reveals and re-masks the value when the toggle is clicked", async () => {
    const user = userEvent.setup()
    render(<PasswordField label="Password" name="password" value="" onChange={() => {}} />)

    await user.click(screen.getByRole("button", { name: "Show password" }))
    expect(screen.getByLabelText("Password")).toHaveAttribute("type", "text")

    await user.click(screen.getByRole("button", { name: "Hide password" }))
    expect(screen.getByLabelText("Password")).toHaveAttribute("type", "password")
  })

  it("renders the toggle as a button that cannot submit a surrounding form", () => {
    render(<PasswordField label="Password" name="password" value="" onChange={() => {}} />)

    expect(screen.getByRole("button", { name: "Show password" })).toHaveAttribute("type", "button")
  })
})
