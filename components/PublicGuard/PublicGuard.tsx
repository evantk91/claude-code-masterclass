"use client"

import { useEffect, type ReactNode } from "react"
import { usePathname, useRouter } from "next/navigation"

// auth
import useUser from "@/hooks/useUser"

// components
import Loader from "@/components/Loader"

// the dev-only component preview page, which shows signed-in and signed-out
// components side by side and so must never be gated either way
const EXEMPT_PATH = "/preview"

// the splash route, which sends every visitor somewhere rather than being a
// destination itself
const SPLASH_PATH = "/"

type PublicGuardProps = {
  children: ReactNode
}

// gates the (public) group: signed-out visitors only, give or take the two
// routes above. Route groups don't appear in the pathname, so these compare
// against the real URL.
export default function PublicGuard({ children }: PublicGuardProps) {
  const { user, loading } = useUser()
  const pathname = usePathname()
  const router = useRouter()

  const exempt = pathname === EXEMPT_PATH
  const isSplash = pathname === SPLASH_PATH

  useEffect(() => {
    if (exempt || loading) return

    // replace, not push — a bounced visitor shouldn't be able to go "back"
    // to the page they were never allowed on
    if (isSplash) router.replace(user ? "/heists" : "/login")
    else if (user) router.replace("/heists")
  }, [exempt, isSplash, loading, user, router])

  if (exempt) return children

  // the splash page always has a redirect coming, so it never renders in place
  if (loading || isSplash || user) return <Loader />

  return children
}
