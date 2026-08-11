// this page should be used only as a splash page to decide where a user should be navigated to
// when logged in --> to /heists
// when not logged in --> to /login

// components
import SplashHero from "@/components/SplashHero"

export default function Home() {
  return (
    <div className="center-content">
      <div className="page-content">
        <SplashHero />
      </div>
    </div>
  )
}
