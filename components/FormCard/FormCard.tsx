"use client"

import { type FormEvent, type ReactNode } from "react"
import styles from "./FormCard.module.css"

// components
import SubmitButton from "@/components/SubmitButton"

type FormCardProps = {
  submitLabel: string
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  error?: string | null
  success?: string | null
  submitting?: boolean
  children: ReactNode
}

// presentational shell for a form that stands on its own — the same card
// AuthForm renders, minus the cross-link only the login/signup pair needs
export default function FormCard({
  submitLabel,
  onSubmit,
  error,
  success,
  submitting,
  children,
}: FormCardProps) {
  // noValidate keeps the browser from blocking submit on a field it dislikes
  return (
    <form className={styles.form} onSubmit={onSubmit} noValidate>
      {children}

      {error && <p className={styles.error} role="alert">{error}</p>}
      {success && <p className={styles.success} role="status">{success}</p>}

      <SubmitButton disabled={submitting}>{submitLabel}</SubmitButton>
    </form>
  )
}
