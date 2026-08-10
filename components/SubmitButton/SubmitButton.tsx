import { type ReactNode } from "react"
import styles from "./SubmitButton.module.css"

type SubmitButtonProps = {
  children: ReactNode
  disabled?: boolean
}

// no "use client" — this holds no state and no handlers; the surrounding form handles submit
export default function SubmitButton({ children, disabled = false }: SubmitButtonProps) {
  return (
    <button type="submit" className={`btn ${styles.submit}`} disabled={disabled}>{children}</button>
  )
}
