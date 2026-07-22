// this page should be used only as a splash page to decide where a user should be navigated to
// when logged in --> to /heists
// when not logged in --> to /login

import { Clock8 } from "lucide-react"

export default function Home() {
  return (
    <div className="center-content">
      <div className="page-content">
        <h1>
          P<Clock8 className="logo" strokeWidth={2.75} />cket Heist
        </h1>
        <div>Tiny missions. Big office mischief.</div>
        <p>
          Welcome to Pocket Heist, where the stapler is fair game and the last
          slice of birthday cake is anyone&apos;s prize. Rally your crew, plot
          your capers, and pull off the perfect low-stakes office heist before
          the clock runs out.
        </p>
        <p>
          Assign missions to your coworkers, track your active jobs, and relive
          your greatest scores in the hall of expired heists. No risk, all
          reward &mdash; just good, harmless fun between deadlines.
        </p>
      </div>
    </div>
  )
}
