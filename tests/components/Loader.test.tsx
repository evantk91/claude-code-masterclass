import { render, screen } from "@testing-library/react"
import { describe, it, expect } from "vitest"

// component imports
import Loader from "@/components/Loader"

describe("Loader", () => {
  it("announces itself as a status for assistive tech", () => {
    render(<Loader />)

    expect(screen.getByRole("status")).toBeInTheDocument()
  })

  it("labels the spinner with loading text", () => {
    render(<Loader />)

    expect(screen.getByRole("status")).toHaveTextContent("Loading")
  })
})
