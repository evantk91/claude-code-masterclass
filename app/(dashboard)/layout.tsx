// components
import Navbar from "@/components/Navbar"
import AuthGuard from "@/components/AuthGuard"

export default function HeistsLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  // the guard wraps the navbar too — it advertises dashboard-only actions, so
  // it would flash at a signed-out visitor on their way to the login page
  return (
    <AuthGuard>
      <Navbar />
      <main>{children}</main>
    </AuthGuard>
  )
}
