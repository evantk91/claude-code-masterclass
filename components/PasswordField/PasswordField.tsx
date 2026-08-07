"use client"

import { useState } from "react"
import { Eye, EyeOff } from "lucide-react"
import styles from "./PasswordField.module.css"

// components
import TextField from "@/components/TextField"

type PasswordFieldProps = {
  label: string
  name: string
  value: string
  onChange: (value: string) => void
  autoComplete?: string
}

export default function PasswordField({
  label,
  name,
  value,
  onChange,
  autoComplete,
}: PasswordFieldProps) {
  const [visible, setVisible] = useState(false)

  // one input with a computed type — rendering two would drop the value and caret on toggle
  return (
    <TextField
      label={label}
      name={name}
      value={value}
      onChange={onChange}
      type={visible ? "text" : "password"}
      autoComplete={autoComplete}
      inputClassName={styles.input}
      adornment={
        <button
          type="button"
          className={styles.toggle}
          aria-label={`${visible ? "Hide" : "Show"} ${label.toLowerCase()}`}
          onClick={() => setVisible((shown) => !shown)}
        >
          {visible ? <EyeOff size={18} aria-hidden /> : <Eye size={18} aria-hidden />}
        </button>
      }
    />
  )
}
