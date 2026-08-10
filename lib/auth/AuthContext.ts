"use client"

import { createContext } from "react"

import type { AuthContextValue } from "./types"

// No default value on purpose: undefined means "no AuthProvider above me",
// which useUser turns into a loud error rather than a component stuck
// reporting loading forever.
export const AuthContext = createContext<AuthContextValue | undefined>(undefined)
