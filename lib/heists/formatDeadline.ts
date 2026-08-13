// pure, render-time formatting of an absolute date — unlike formatTimeLeft,
// this never reads "now", so it's deterministic for any deadline passed in
export function formatDeadline(deadline: Date): string {
  const datePart = deadline.toLocaleDateString("en-US", { month: "short", day: "numeric" })
  const timePart = deadline.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })
  return `${datePart}, ${timePart}`
}
