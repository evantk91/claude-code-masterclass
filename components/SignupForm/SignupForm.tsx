"use client"

import { useState, type FormEvent } from "react"

// components
import AuthForm from "@/components/AuthForm"
import TextField from "@/components/TextField"
import PasswordField from "@/components/PasswordField"

export default function SignupForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    // TODO: temporary stub — remove when real auth lands; never log credentials in production
    console.log({ email, password })
  }

  return (
    <AuthForm
      submitLabel="Sign Up"
      switchPrompt="Already have an account?"
      switchHref="/login"
      switchLabel="Log in"
      onSubmit={handleSubmit}
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
