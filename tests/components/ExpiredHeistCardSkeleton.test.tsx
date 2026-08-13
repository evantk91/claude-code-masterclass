import { render, screen } from "@testing-library/react"
import { describe, it, expect } from "vitest"

// component imports
import ExpiredHeistCardSkeleton from "@/components/ExpiredHeistCardSkeleton"

describe("ExpiredHeistCardSkeleton", () => {
  it("renders without throwing and without any real heist data", () => {
    render(<ExpiredHeistCardSkeleton />)

    expect(screen.queryByRole("link")).not.toBeInTheDocument()
    expect(screen.queryByRole("button")).not.toBeInTheDocument()
  })
})
