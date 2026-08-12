// pure, render-time formatting — no ticking, no interval. Realistic range is
// 0-48h (HEIST_WINDOW_MS), so hours until under an hour, then minutes
export function formatTimeLeft(deadline: Date): string {
  const msLeft = deadline.getTime() - new Date().getTime()

  if (msLeft <= 0) return "Deadline passed"

  const hoursLeft = Math.floor(msLeft / (60 * 60 * 1000))
  if (hoursLeft >= 1) return `${hoursLeft}h left`

  // never show "0m left" while time genuinely remains
  const minutesLeft = Math.max(1, Math.floor(msLeft / (60 * 1000)))
  return `${minutesLeft}m left`
}
