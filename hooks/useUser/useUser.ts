"use client"

import { useContext } from "react"

// auth
import { AuthContext } from "@/lib/auth/AuthContext"
import type { AuthContextValue } from "@/lib/auth/types"

export default function useUser(): AuthContextValue {
  const context = useContext(AuthContext)

  // only undefined when no AuthProvider sits above this component
  if (context === undefined) {
    throw new Error("useUser must be used within an AuthProvider")
  }

  return context
}
