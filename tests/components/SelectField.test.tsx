import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, it, expect, vi } from "vitest"

// component imports
import SelectField from "@/components/SelectField"

const options = [
  { value: "uid-2", label: "QuietMidnightCrow" },
  { value: "uid-3", label: "SilentShadowFox" },
]

describe("SelectField", () => {
  it("associates the label with the select", () => {
    render(
      <SelectField
        label="Assign To"
        name="assignedTo"
        value=""
        onChange={() => {}}
        options={options}
      />,
    )

    expect(screen.getByLabelText("Assign To")).toBeInTheDocument()
  })

  it("renders an option for each choice it is given", () => {
    render(
      <SelectField
        label="Assign To"
        name="assignedTo"
        value=""
        onChange={() => {}}
        options={options}
      />,
    )

    expect(screen.getByRole("option", { name: "QuietMidnightCrow" })).toBeInTheDocument()
    expect(screen.getByRole("option", { name: "SilentShadowFox" })).toBeInTheDocument()
  })

  it("shows the placeholder as an empty-valued option", () => {
    render(
      <SelectField
        label="Assign To"
        name="assignedTo"
        value=""
        onChange={() => {}}
        options={options}
        placeholder="Pick your accomplice"
      />,
    )

    expect(screen.getByRole("option", { name: "Pick your accomplice" })).toHaveValue("")
  })

  it("renders no placeholder option when it is given none", () => {
    render(
      <SelectField
        label="Assign To"
        name="assignedTo"
        value="uid-2"
        onChange={() => {}}
        options={options}
      />,
    )

    expect(screen.getAllByRole("option")).toHaveLength(2)
  })

  it("renders the selected value", () => {
    render(
      <SelectField
        label="Assign To"
        name="assignedTo"
        value="uid-3"
        onChange={() => {}}
        options={options}
      />,
    )

    expect(screen.getByLabelText("Assign To")).toHaveValue("uid-3")
  })

  it("calls onChange with the chosen value", async () => {
    const user = userEvent.setup()
    const handleChange = vi.fn()
    render(
      <SelectField
        label="Assign To"
        name="assignedTo"
        value=""
        onChange={handleChange}
        options={options}
        placeholder="Pick your accomplice"
      />,
    )

    await user.selectOptions(screen.getByLabelText("Assign To"), "uid-2")

    expect(handleChange).toHaveBeenCalledWith("uid-2")
  })

  it("gives each instance a unique id so labels do not cross-associate", () => {
    render(
      <>
        <SelectField label="First" name="first" value="uid-2" onChange={() => {}} options={options} />
        <SelectField label="Second" name="second" value="uid-3" onChange={() => {}} options={options} />
      </>,
    )

    expect(screen.getByLabelText("First")).toHaveValue("uid-2")
    expect(screen.getByLabelText("Second")).toHaveValue("uid-3")
  })
})
