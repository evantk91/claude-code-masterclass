"use client"

import { useState, type FormEvent } from "react"
import { useRouter } from "next/navigation"

// components
import AuthForm from "@/components/AuthForm"
import TextField from "@/components/TextField"
import PasswordField from "@/components/PasswordField"

// auth
import { signUp } from "@/lib/auth/signUp"

export default function SignupForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    // the button is disabled mid-flight too; this guards a submit that skips it
    if (isSubmitting) return

    setIsSubmitting(true)
    setError(null)

    try {
      await signUp(email, password)
      // left submitting on purpose — the page is on its way out
      router.push("/heists")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.")
      setIsSubmitting(false)
    }
  }

  return (
    <AuthForm
      submitLabel="Sign Up"
      switchPrompt="Already have an account?"
      switchHref="/login"
      switchLabel="Log in"
      onSubmit={handleSubmit}
      error={error}
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
        autoComplete="new-password"
        value={password}
        onChange={setPassword}
      />
    </AuthForm>
  )
}
