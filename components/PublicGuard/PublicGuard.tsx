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

type PublicGuardProps = {
  children: ReactNode
}

// gates the (public) group: signed-out visitors only, give or take the
// preview route above. This includes the splash route ("/"), which is a
// real destination for signed-out visitors and only bounces once signed in.
export default function PublicGuard({ children }: PublicGuardProps) {
  const { user, loading } = useUser()
  const pathname = usePathname()
  const router = useRouter()

  const exempt = pathname === EXEMPT_PATH

  useEffect(() => {
    if (exempt || loading || !user) return

    // replace, not push — a bounced visitor shouldn't be able to go "back"
    // to the page they were never allowed on
    router.replace("/heists")
  }, [exempt, loading, user, router])

  if (exempt) return children

  if (loading || user) return <Loader />

  return children
}
