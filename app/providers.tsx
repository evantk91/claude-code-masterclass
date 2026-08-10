import type { ReactNode } from "react"

// providers
import AuthProvider from "@/components/AuthProvider"

type ProvidersProps = {
  children: ReactNode
}

// One place to compose every app-wide provider, so the root layout only ever
// mounts this. Deliberately directive-free: each provider declares its own
// "use client", so nesting them here costs the server nothing.
export default function Providers({ children }: ProvidersProps) {
  return <AuthProvider>{children}</AuthProvider>
}
