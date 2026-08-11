import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, it, expect, vi } from "vitest"

// component imports
import FormCard from "@/components/FormCard"

const shellProps = {
  submitLabel: "Create Heist",
  onSubmit: () => {},
}

describe("FormCard", () => {
  it("renders its children as the form fields", () => {
    render(
      <FormCard {...shellProps}>
        <input aria-label="Title" />
      </FormCard>,
    )

    expect(screen.getByRole("textbox", { name: "Title" })).toBeInTheDocument()
  })

  it("renders the given submit label", () => {
    render(<FormCard {...shellProps}>{null}</FormCard>)

    expect(screen.getByRole("button", { name: "Create Heist" })).toBeInTheDocument()
  })

  it("renders no cross-link — this form stands on its own", () => {
    render(<FormCard {...shellProps}>{null}</FormCard>)

    expect(screen.queryByRole("link")).not.toBeInTheDocument()
  })

  it("calls onSubmit when the submit button is clicked", async () => {
    const user = userEvent.setup()
    const handleSubmit = vi.fn((event) => event.preventDefault())
    render(<FormCard {...shellProps} onSubmit={handleSubmit}>{null}</FormCard>)

    await user.click(screen.getByRole("button", { name: "Create Heist" }))

    expect(handleSubmit).toHaveBeenCalledTimes(1)
  })

  it("shows the error it is given", () => {
    render(<FormCard {...shellProps} error="We couldn't set up that heist.">{null}</FormCard>)

    expect(screen.getByRole("alert")).toHaveTextContent("We couldn't set up that heist.")
  })

  it("shows no error by default", () => {
    render(<FormCard {...shellProps}>{null}</FormCard>)

    expect(screen.queryByRole("alert")).not.toBeInTheDocument()
  })

  it("shows the success message it is given", () => {
    render(<FormCard {...shellProps} success="The job is on.">{null}</FormCard>)

    expect(screen.getByRole("status")).toHaveTextContent("The job is on.")
  })

  it("shows no success message by default", () => {
    render(<FormCard {...shellProps}>{null}</FormCard>)

    expect(screen.queryByRole("status")).not.toBeInTheDocument()
  })

  it("disables the submit button while submitting", () => {
    render(<FormCard {...shellProps} submitting>{null}</FormCard>)

    expect(screen.getByRole("button", { name: "Create Heist" })).toBeDisabled()
  })

  it("leaves the submit button enabled when not submitting", () => {
    render(<FormCard {...shellProps}>{null}</FormCard>)

    expect(screen.getByRole("button", { name: "Create Heist" })).toBeEnabled()
  })
})
