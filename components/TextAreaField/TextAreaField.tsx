"use client"

import { useId } from "react"
import styles from "./TextAreaField.module.css"

type TextAreaFieldProps = {
  label: string
  name: string
  value: string
  onChange: (value: string) => void
  rows?: number
}

// TextField's shape, for the answers that run longer than one line
export default function TextAreaField({
  label,
  name,
  value,
  onChange,
  rows = 4,
}: TextAreaFieldProps) {
  // unique per instance, so a page can render several fields without clashing ids
  const id = useId()

  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={id}>{label}</label>
      <div className={styles.control}>
        <textarea
          id={id}
          name={name}
          rows={rows}
          className={styles.input}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      </div>
    </div>
  )
}
