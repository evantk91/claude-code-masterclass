// components
import PublicGuard from "@/components/PublicGuard"

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  // <main> stays outside the guard — it is a styling hook with nothing of its
  // own to leak, so there is no reason to withhold it while auth resolves
  return (
    <main className="public">
      <PublicGuard>{children}</PublicGuard>
    </main>
  )
}
