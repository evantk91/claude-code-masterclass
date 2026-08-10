import { describe, it, expect, vi, afterEach } from "vitest"

// component imports
import {
  generateCodename,
  STEALTH_ADJECTIVES,
  HEIST_NOUNS,
  AGENT_ANIMALS,
} from "@/lib/codename/generateCodename"

afterEach(() => {
  vi.restoreAllMocks()
})

describe("generateCodename", () => {
  it("takes the first word of every list when the random source bottoms out", () => {
    const codename = generateCodename(() => 0)

    expect(codename).toBe(`${STEALTH_ADJECTIVES[0]}${HEIST_NOUNS[0]}${AGENT_ANIMALS[0]}`)
  })

  it("takes the last word of every list when the random source tops out", () => {
    const codename = generateCodename(() => 0.999999)

    const last = [STEALTH_ADJECTIVES, HEIST_NOUNS, AGENT_ANIMALS]
      .map((list) => list[list.length - 1])
      .join("")

    expect(codename).toBe(last)
  })

  it("falls back to Math.random when no source is given", () => {
    vi.spyOn(Math, "random").mockReturnValue(0)

    expect(generateCodename()).toBe(`${STEALTH_ADJECTIVES[0]}${HEIST_NOUNS[0]}${AGENT_ANIMALS[0]}`)
  })

  it("joins the three words in PascalCase with no separator", () => {
    expect(generateCodename()).toMatch(/^([A-Z][a-z]+){3}$/)
  })

  it("never repeats a word across the three lists", () => {
    const everyWord = [...STEALTH_ADJECTIVES, ...HEIST_NOUNS, ...AGENT_ANIMALS]

    expect(new Set(everyWord).size).toBe(everyWord.length)
  })

  it("keeps every list long enough to make collisions unlikely", () => {
    expect(STEALTH_ADJECTIVES.length).toBeGreaterThanOrEqual(8)
    expect(HEIST_NOUNS.length).toBeGreaterThanOrEqual(8)
    expect(AGENT_ANIMALS.length).toBeGreaterThanOrEqual(8)
  })
})
