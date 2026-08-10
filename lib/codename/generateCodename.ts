// A codename is one word from each list, jammed together in PascalCase.
// The words are stored already capitalized so building the name is a plain
// concatenation — there is no runtime casing step to get wrong.

type RandomSource = () => number

export const STEALTH_ADJECTIVES = [
  "Silent",
  "Sly",
  "Swift",
  "Covert",
  "Cunning",
  "Shadowy",
  "Sneaky",
  "Elusive",
  "Masked",
  "Nimble",
] as const

export const HEIST_NOUNS = [
  "Shadow",
  "Midnight",
  "Phantom",
  "Vault",
  "Whisper",
  "Smoke",
  "Mirage",
  "Echo",
  "Twilight",
  "Lockpick",
] as const

export const AGENT_ANIMALS = [
  "Fox",
  "Wolf",
  "Raven",
  "Viper",
  "Falcon",
  "Panther",
  "Cobra",
  "Jackal",
  "Hawk",
  "Lynx",
] as const

function pick(list: readonly string[], random: RandomSource): string {
  return list[Math.floor(random() * list.length)]
}

// random is injectable so tests can pin the result; callers pass nothing
export function generateCodename(random: RandomSource = Math.random): string {
  return pick(STEALTH_ADJECTIVES, random) + pick(HEIST_NOUNS, random) + pick(AGENT_ANIMALS, random)
}
