"use client"

import { useId, type ReactNode } from "react"
import styles from "./TextField.module.css"

type TextFieldProps = {
  label: string
  name: string
  value: string
  onChange: (value: string) => void
  type?: string
  autoComplete?: string
  inputClassName?: string
  adornment?: ReactNode
}

export default function TextField({
  label,
  name,
  value,
  onChange,
  type = "text",
  autoComplete,
  inputClassName,
  adornment,
}: TextFieldProps) {
  // unique per instance, so a page can render several fields without clashing ids
  const id = useId()

  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={id}>{label}</label>
      <div className={styles.control}>
        <input
          id={id}
          name={name}
          type={type}
          autoComplete={autoComplete}
          className={inputClassName ? `${styles.input} ${inputClassName}` : styles.input}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
        {adornment}
      </div>
    </div>
  )
}
