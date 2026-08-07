import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, it, expect, vi } from "vitest"

// component imports
import TextField from "@/components/TextField"

describe("TextField", () => {
  it("associates the label with the input", () => {
    render(<TextField label="Email" name="email" value="" onChange={() => {}} />)

    expect(screen.getByLabelText("Email")).toBeInTheDocument()
  })

  it("renders the given value and input type", () => {
    render(<TextField label="Email" name="email" type="email" value="ghost@heist.dev" onChange={() => {}} />)

    const input = screen.getByLabelText("Email")
    expect(input).toHaveValue("ghost@heist.dev")
    expect(input).toHaveAttribute("type", "email")
  })

  it("calls onChange with the new value as the user types", async () => {
    const user = userEvent.setup()
    const handleChange = vi.fn()
    render(<TextField label="Email" name="email" value="" onChange={handleChange} />)

    await user.type(screen.getByLabelText("Email"), "a")

    expect(handleChange).toHaveBeenCalledWith("a")
  })

  it("gives each instance a unique id so labels do not cross-associate", () => {
    render(
      <>
        <TextField label="First" name="first" value="one" onChange={() => {}} />
        <TextField label="Second" name="second" value="two" onChange={() => {}} />
      </>,
    )

    expect(screen.getByLabelText("First")).toHaveValue("one")
    expect(screen.getByLabelText("Second")).toHaveValue("two")
  })

  it("renders an adornment alongside the input", () => {
    render(
      <TextField
        label="Email"
        name="email"
        value=""
        onChange={() => {}}
        adornment={<button type="button">Clear</button>}
      />,
    )

    expect(screen.getByRole("button", { name: "Clear" })).toBeInTheDocument()
  })
})
