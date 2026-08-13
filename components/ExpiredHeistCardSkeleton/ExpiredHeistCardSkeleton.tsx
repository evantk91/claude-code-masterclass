import styles from "./ExpiredHeistCardSkeleton.module.css"

// mirrors ExpiredHeistCard's row while the expired list is loading — no
// props, since it never has real data to reflect
export default function ExpiredHeistCardSkeleton() {
  return (
    <div className={styles.row}>
      <div className={styles.header}>
        <div className={styles.titleGroup}>
          <div className={styles.statusIcon} />
          <div className={styles.titleLine} />
        </div>
        <div className={styles.headerRight}>
          <div className={styles.deadlineLine} />
          <div className={styles.badgeBlock} />
        </div>
      </div>
      <div className={styles.meta}>
        <div className={styles.metaRow}>
          <div className={styles.metaIcon} />
          <div className={styles.metaLine} />
        </div>
        <div className={styles.metaRow}>
          <div className={styles.metaIcon} />
          <div className={styles.metaLine} />
        </div>
      </div>
    </div>
  )
}
