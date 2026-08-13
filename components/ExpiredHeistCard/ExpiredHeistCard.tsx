import Link from "next/link"
import { CheckCircle2, XCircle, User, Calendar } from "lucide-react"
import styles from "./ExpiredHeistCard.module.css"

// types
import type { Heist } from "@/types/firestore/heist"

// heists
import { formatDeadline } from "@/lib/heists/formatDeadline"

type ExpiredHeistCardProps = {
  heist: Heist
}

export default function ExpiredHeistCard({ heist }: ExpiredHeistCardProps) {
  const isSuccess = heist.finalStatus === "success"
  const StatusIcon = isSuccess ? CheckCircle2 : XCircle
  const statusIconClass = isSuccess ? styles.statusIconSuccess : styles.statusIconFailure
  const badgeClass = `${styles.badge} ${isSuccess ? styles.badgeSuccess : styles.badgeFailure}`

  return (
    <div className={styles.row}>
      <div className={styles.header}>
        <div className={styles.titleGroup}>
          <StatusIcon className={statusIconClass} aria-hidden="true" />
          <Link href={`/heists/${heist.id}`} className={styles.title}>
            {heist.title}
          </Link>
        </div>
        <div className={styles.headerRight}>
          <div className={styles.deadline}>
            <Calendar className={styles.metaIcon} aria-hidden="true" />
            <span>{formatDeadline(heist.deadline)}</span>
          </div>
          <span className={badgeClass}>{isSuccess ? "SUCCESS" : "FAILURE"}</span>
        </div>
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
      </div>
    </div>
  )
}
