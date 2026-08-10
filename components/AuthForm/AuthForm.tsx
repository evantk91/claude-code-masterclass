"use client"

import { type FormEvent, type ReactNode } from "react"
import Link from "next/link"
import styles from "./AuthForm.module.css"

// components
import SubmitButton from "@/components/SubmitButton"

type AuthFormProps = {
  submitLabel: string
  switchPrompt: string
  switchHref: string
  switchLabel: string
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  error?: string | null
  success?: string | null
  submitting?: boolean
  children: ReactNode
}

// presentational shell shared by LoginForm and SignupForm — holds no state of its own
export default function AuthForm({
  submitLabel,
  switchPrompt,
  switchHref,
  switchLabel,
  onSubmit,
  error,
  success,
  submitting,
  children,
}: AuthFormProps) {
  // noValidate keeps the browser from blocking submit on a malformed email
  return (
    <form className={styles.form} onSubmit={onSubmit} noValidate>
      {children}

      {error && <p className={styles.error} role="alert">{error}</p>}
      {success && <p className={styles.success} role="status">{success}</p>}

      <SubmitButton disabled={submitting}>{submitLabel}</SubmitButton>

      <p className={styles.switchMode}>
        {switchPrompt} <Link href={switchHref}>{switchLabel}</Link>
      </p>
    </form>
  )
}
