"use client"

import { useId } from "react"
import styles from "./SelectField.module.css"

type SelectOption = {
  value: string
  label: string
}

type SelectFieldProps = {
  label: string
  name: string
  value: string
  onChange: (value: string) => void
  options: SelectOption[]
  placeholder?: string
}

// TextField's shape, for picking one of a known set. Deliberately knows
// nothing about what it is listing — the parent maps its data into options.
export default function SelectField({
  label,
  name,
  value,
  onChange,
  options,
  placeholder,
}: SelectFieldProps) {
  // unique per instance, so a page can render several fields without clashing ids
  const id = useId()

  return (
    <div className={styles.field}>
      <label className={styles.label} htmlFor={id}>{label}</label>
      <div className={styles.control}>
        <select
          id={id}
          name={name}
          className={styles.input}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        >
          {placeholder && <option value="">{placeholder}</option>}

          {options.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      </div>
    </div>
  )
}
