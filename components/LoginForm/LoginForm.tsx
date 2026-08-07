"use client"

import { useState, type FormEvent } from "react"

// components
import AuthForm from "@/components/AuthForm"
import TextField from "@/components/TextField"
import PasswordField from "@/components/PasswordField"

export default function LoginForm() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    // TODO: temporary stub — remove when real auth lands; never log credentials in production
    console.log({ email, password })
  }

  return (
    <AuthForm
      submitLabel="Log In"
      switchPrompt="Don't have an account?"
      switchHref="/signup"
      switchLabel="Sign up"
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
        autoComplete="current-password"
        value={password}
        onChange={setPassword}
      />
    </AuthForm>
  )
}
