import styles from "./HeistCardSkeleton.module.css"

// mirrors HeistCard's box while a heist list is loading — no props, since it
// never has real data to reflect
export default function HeistCardSkeleton() {
  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <div className={styles.titleLines}>
          <div className={styles.line} />
          <div className={`${styles.line} ${styles.lineShort}`} />
        </div>
        <div className={styles.clock} />
      </div>
      <div className={styles.meta}>
        <div className={styles.metaRow}>
          <div className={styles.metaIcon} />
          <div className={`${styles.line} ${styles.lineMeta}`} />
        </div>
        <div className={styles.metaRow}>
          <div className={styles.metaIcon} />
          <div className={`${styles.line} ${styles.lineMeta}`} />
        </div>
        <div className={styles.metaRow}>
          <div className={styles.metaIcon} />
          <div className={`${styles.line} ${styles.lineMetaWide}`} />
        </div>
      </div>
    </div>
  )
}
