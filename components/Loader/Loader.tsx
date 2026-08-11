import { Loader2 } from "lucide-react"

// stands in for a whole page while auth state is still resolving — deliberately
// plainer than Skeleton, which is shaped like the card lists it stands in for
export default function Loader() {
  return (
    <div className="center-content" role="status">
      <Loader2 className="mx-auto animate-spin" size={32} aria-hidden="true" />
      <span className="sr-only">Loading…</span>
    </div>
  )
}
