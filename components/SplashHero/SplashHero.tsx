import { Clock8, Target, Radar, Trophy } from "lucide-react"
import Link from "next/link"
import styles from "./SplashHero.module.css"

const CAPABILITIES = [
  {
    icon: Target,
    label: "Assign the job",
    description: "Hand a mission to a coworker and set the stakes.",
  },
  {
    icon: Radar,
    label: "Run surveillance",
    description: "Track every heist in progress, live.",
  },
  {
    icon: Trophy,
    label: "Case closed",
    description: "Relive your best scores in the hall of expired heists.",
  },
]

export default function SplashHero() {
  return (
    <div className={styles.hero}>
      <div className={styles.copy}>
        <p className={styles.eyebrow}>
          <span className={styles.statusDot} />
          Case file &mdash; status: open
        </p>

        <h1>
          P<Clock8 className="logo" strokeWidth={2.75} />cket Heist
        </h1>
        <div className={styles.tagline}>Tiny missions. Big office mischief.</div>

        <p className={styles.lead}>
          The stapler is fair game. The last slice of birthday cake is
          anyone&apos;s prize. Rally your crew, plot your capers, and pull off
          the perfect low-stakes office heist before the clock runs out
          &mdash; no risk, all reward.
        </p>

        <div className={styles.actions}>
          <Link href="/signup" className="btn">Register</Link>
          <Link href="/login" className={styles.loginLink}>
            Already on the crew? Log in
          </Link>
        </div>
      </div>

      <div className={styles.dossier} aria-hidden="true">
        <span className={styles.caseNumber}>Case No. 0192</span>
        <div className={styles.stamp}>
          <Clock8 strokeWidth={2} className={styles.stampIcon} />
          <span>Clearance Granted</span>
        </div>
        <div className={styles.redactedLines}>
          <span />
          <span />
          <span />
        </div>
      </div>

      <ul className={styles.capabilities}>
        {CAPABILITIES.map(({ icon: Icon, label, description }) => (
          <li key={label}>
            <Icon className={styles.capabilityIcon} strokeWidth={2} size={20} />
            <span className={styles.capabilityLabel}>{label}</span>
            <p>{description}</p>
          </li>
        ))}
      </ul>
    </div>
  )
}
