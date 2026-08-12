import Link from "next/link"
import { Clock8, User, Calendar } from "lucide-react"
import styles from "./HeistCard.module.css"

// types
import type { Heist } from "@/types/firestore/heist"

// heists
import { formatTimeLeft } from "@/lib/heists/formatTimeLeft"

type HeistCardProps = {
  heist: Heist
}

export default function HeistCard({ heist }: HeistCardProps) {
  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <Link href={`/heists/${heist.id}`} className={styles.title}>
          {heist.title}
        </Link>
        <Clock8 className={styles.clockIcon} aria-hidden="true" />
      </div>
      <div className={styles.meta}>
        <div className={styles.metaRow}>
          <User className={styles.metaIcon} aria-hidden="true" />
          <span className={styles.metaLabel}>To:</span>
          <span className={styles.assignee}>@{heist.assignedToCodename}</span>
        </div>
        <div className={styles.metaRow}>
          <User className={styles.metaIcon} aria-hidden="true" />
          <span className={styles.metaLabel}>By:</span>
          <span className={styles.assigner}>@{heist.createdByCodename}</span>
        </div>
        <div className={styles.metaRow}>
          <Calendar className={styles.metaIcon} aria-hidden="true" />
          <span className={styles.metaLabel}>{formatTimeLeft(heist.deadline)}</span>
        </div>
      </div>
    </div>
  )
}
