"use client"

import { useState } from "react"

// auth
import useUser from "@/hooks/useUser"
import { signOut } from "@/lib/auth/signOut"

import styles from "./LogoutButton.module.css"

export default function LogoutButton() {
  const { user, loading } = useUser()
  const [isSigningOut, setIsSigningOut] = useState(false)

  // nothing to sign out of — and rendering nothing while loading avoids a
  // button that flashes in and straight back out on a restored session
  if (loading || !user) return null

  async function handleClick() {
    // the button is disabled mid-flight too; this guards a click that skips it
    if (isSigningOut) return

    setIsSigningOut(true)

    try {
      await signOut()
      // left signing out on purpose — a successful sign-out flips the auth
      // listener, which unmounts this component before any reset could matter
    } catch (error) {
      // the navbar has nowhere to show this; logging is the whole story
      console.error("Sign out failed:", error)
      setIsSigningOut(false)
    }
  }

  return (
    <button type="button" className={styles.logoutBtn} onClick={handleClick} disabled={isSigningOut}>
      Logout
    </button>
  )
}
