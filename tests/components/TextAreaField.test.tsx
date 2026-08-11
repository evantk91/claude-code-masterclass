import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, it, expect, vi } from "vitest"

// component imports
import TextAreaField from "@/components/TextAreaField"

describe("TextAreaField", () => {
  it("associates the label with the textarea", () => {
    render(<TextAreaField label="Description" name="description" value="" onChange={() => {}} />)

    expect(screen.getByLabelText("Description")).toBeInTheDocument()
  })

  it("renders the given value", () => {
    render(
      <TextAreaField
        label="Description"
        name="description"
        value="Third desk from the window."
        onChange={() => {}}
      />,
    )

    expect(screen.getByLabelText("Description")).toHaveValue("Third desk from the window.")
  })

  it("gives the description room to breathe by default", () => {
    render(<TextAreaField label="Description" name="description" value="" onChange={() => {}} />)

    expect(screen.getByLabelText("Description")).toHaveAttribute("rows", "4")
  })

  it("takes a row count when the default is the wrong size", () => {
    render(
      <TextAreaField label="Description" name="description" value="" onChange={() => {}} rows={8} />,
    )

    expect(screen.getByLabelText("Description")).toHaveAttribute("rows", "8")
  })

  it("calls onChange with the new value as the user types", async () => {
    const user = userEvent.setup()
    const handleChange = vi.fn()
    render(
      <TextAreaField label="Description" name="description" value="" onChange={handleChange} />,
    )

    await user.type(screen.getByLabelText("Description"), "a")

    expect(handleChange).toHaveBeenCalledWith("a")
  })

  it("gives each instance a unique id so labels do not cross-associate", () => {
    render(
      <>
        <TextAreaField label="First" name="first" value="one" onChange={() => {}} />
        <TextAreaField label="Second" name="second" value="two" onChange={() => {}} />
      </>,
    )

    expect(screen.getByLabelText("First")).toHaveValue("one")
    expect(screen.getByLabelText("Second")).toHaveValue("two")
  })
})
