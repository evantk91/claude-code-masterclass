"use client"

import { useState, type FormEvent } from "react"

// components
import AuthForm from "@/components/AuthForm"
import TextField from "@/components/TextField"
import PasswordField from "@/components/PasswordField"

// auth
import { signIn } from "@/lib/auth/signIn"

const SUCCESS_MESSAGE = "You're logged in."

export default function LoginForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (isSubmitting) return

    setIsSubmitting(true)
    setError(null)
    setSuccess(null)

    try {
      await signIn(email, password)
      setSuccess(SUCCESS_MESSAGE)
      setIsSubmitting(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.")
      setIsSubmitting(false)
    }
  }

  return (
    <AuthForm
      submitLabel="Log In"
      switchPrompt="Don't have an account?"
      switchHref="/signup"
      switchLabel="Sign up"
      onSubmit={handleSubmit}
      error={error}
      success={success}
      submitting={isSubmitting}
    >
      <TextField
        label="Email"
        name="email"
        type="email"
        autoComplete="email"
        value={email}
        onChange={setEmail}
      />

      <PasswordField
        label="Password"
        name="password"
        autoComplete="current-password"
        value={password}
        onChange={setPassword}
      />
    </AuthForm>
  )
}
