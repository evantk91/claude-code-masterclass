import { Clock8, Plus } from "lucide-react"
import Link from "next/link"

// components
import LogoutButton from "@/components/LogoutButton"

import styles from "./Navbar.module.css"

export default function Navbar() {
  return (
    <div className={styles.siteNav}>
      <nav>
        <header>
          <h1>
            <Link href="/heists">
              P<Clock8 className={styles.logo} size={14} strokeWidth={2.75} />
              cket Heist
            </Link>
          </h1>
          <div>Tiny missions. Big office mischief.</div>
        </header>
        <div className={styles.actions}>
          {/* renders nothing when signed out, so the gap collapses with it */}
          <LogoutButton />
          <ul>
            <li>
              <Link href="/heists/create" className={styles.createBtn}>
                <Plus size={20} strokeWidth={2} />
                Create New Heist
              </Link>
            </li>
          </ul>
        </div>
      </nav>
    </div>
  )
}
