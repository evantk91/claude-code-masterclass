"use client"

import { useEffect, useState, type ReactNode } from "react"
import { onAuthStateChanged } from "firebase/auth"

// auth
import { auth } from "@/lib/firebase/config"
import { AuthContext } from "@/lib/auth/AuthContext"
import type { User, AuthContextValue } from "@/lib/auth/types"

type AuthProviderProps = {
  children: ReactNode
}

export default function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  // Subscribes once for the life of the app. Living in an effect keeps
  // Firebase's browser-only auth SDK out of the server render, and
  // onAuthStateChanged hands back its own unsubscribe to use as the cleanup.
  useEffect(() => {
    return onAuthStateChanged(auth, (firebaseUser) => {
      setUser(
        firebaseUser
          ? { uid: firebaseUser.uid, email: firebaseUser.email, displayName: firebaseUser.displayName }
          : null
      )
      setLoading(false)
    })
  }, [])

  const value: AuthContextValue = { user, loading }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
