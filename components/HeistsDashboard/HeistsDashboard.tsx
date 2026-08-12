"use client"

// heists
import useHeists from "@/hooks/useHeists"

export default function HeistsDashboard() {
  const activeHeists = useHeists("active")
  const assignedHeists = useHeists("assigned")
  const expiredHeists = useHeists("expired")

  return (
    <div className="page-content">
      <div className="active-heists">
        <h2>Your Active Heists</h2>
        <ul>
          {activeHeists.map((heist) => (
            <li key={heist.id}>{heist.title}</li>
          ))}
        </ul>
      </div>
      <div className="assigned-heists">
        <h2>Heists You've Assigned</h2>
        <ul>
          {assignedHeists.map((heist) => (
            <li key={heist.id}>{heist.title}</li>
          ))}
        </ul>
      </div>
      <div className="expired-heists">
        <h2>All Expired Heists</h2>
        <ul>
          {expiredHeists.map((heist) => (
            <li key={heist.id}>{heist.title}</li>
          ))}
        </ul>
      </div>
    </div>
  )
}
