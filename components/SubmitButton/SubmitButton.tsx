import { type ReactNode } from "react"
import styles from "./SubmitButton.module.css"

type SubmitButtonProps = {
  children: ReactNode
}

// no "use client" — this holds no state and no handlers; the surrounding form handles submit
export default function SubmitButton({ children }: SubmitButtonProps) {
  return (
    <button type="submit" className={`btn ${styles.submit}`}>{children}</button>
  )
}
