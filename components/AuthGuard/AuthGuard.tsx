"use client"

import { useEffect, type ReactNode } from "react"
import { useRouter } from "next/navigation"

// auth
import useUser from "@/hooks/useUser"

// components
import Loader from "@/components/Loader"

type AuthGuardProps = {
  children: ReactNode
}

// gates the (dashboard) group: signed-in visitors only
export default function AuthGuard({ children }: AuthGuardProps) {
  const { user, loading } = useUser()
  const router = useRouter()

  useEffect(() => {
    if (loading || user) return

    // replace, not push — a bounced visitor shouldn't be able to go "back"
    // to the page they were never allowed on
    router.replace("/login")
  }, [loading, user, router])

  // the loader covers both waiting on firebase and waiting on the redirect,
  // so dashboard chrome never flashes at someone on their way out
  if (loading || !user) return <Loader />

  return children
}
