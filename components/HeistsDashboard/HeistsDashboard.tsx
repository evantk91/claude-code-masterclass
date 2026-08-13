"use client"

// heists
import useHeists from "@/hooks/useHeists"

// components
import HeistCard from "@/components/HeistCard"
import HeistCardSkeleton from "@/components/HeistCardSkeleton"
import ExpiredHeistCard from "@/components/ExpiredHeistCard"
import ExpiredHeistCardSkeleton from "@/components/ExpiredHeistCardSkeleton"

// fills the grid while a mode is still loading — matches the column count
// at the md+ breakpoint
const SKELETON_COUNT = 3
const HEIST_GRID_CLASSES = "grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3"
// expired rows are full-width, not grid cells, so they stack instead
const EXPIRED_STACK_CLASSES = "flex flex-col gap-3"

export default function HeistsDashboard() {
  const active = useHeists("active")
  const assigned = useHeists("assigned")
  const expired = useHeists("expired")

  return (
    <div className="page-content">
      <div className="active-heists">
        <h2>Your Active Heists</h2>
        <div className={HEIST_GRID_CLASSES}>
          {active.loading
            ? Array.from({ length: SKELETON_COUNT }, (_, index) => <HeistCardSkeleton key={index} />)
            : active.heists.map((heist) => <HeistCard key={heist.id} heist={heist} />)}
        </div>
      </div>
      <div className="assigned-heists">
        <h2>Heists You've Assigned</h2>
        <div className={HEIST_GRID_CLASSES}>
          {assigned.loading
            ? Array.from({ length: SKELETON_COUNT }, (_, index) => <HeistCardSkeleton key={index} />)
            : assigned.heists.map((heist) => <HeistCard key={heist.id} heist={heist} />)}
        </div>
      </div>
      <div className="expired-heists">
        <h2>All Expired Heists</h2>
        <div className={EXPIRED_STACK_CLASSES}>
          {expired.loading
            ? Array.from({ length: SKELETON_COUNT }, (_, index) => <ExpiredHeistCardSkeleton key={index} />)
            : expired.heists.map((heist) => <ExpiredHeistCard key={heist.id} heist={heist} />)}
        </div>
      </div>
    </div>
  )
}
