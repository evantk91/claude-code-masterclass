// preview page for newly created UI components

import Skeleton from "@/components/Skeleton"
import LoginForm from "@/components/LoginForm"
import SignupForm from "@/components/SignupForm"
import LogoutButton from "@/components/LogoutButton"
import SplashHero from "@/components/SplashHero"
import CreateHeistForm from "@/components/CreateHeistForm"

export default function PreviewPage() {
  return (
    <div className="page-content">
      <h2>Preview</h2>
      <div className="grid grid-cols-2 gap-4">
        <Skeleton />
        <Skeleton />
        <Skeleton />
        <Skeleton />
      </div>
      <div className="mt-8 flex flex-col gap-8">
        <div>
          <h3>SplashHero</h3>
          <SplashHero />
        </div>
        <div>
          <h3>LoginForm</h3>
          <LoginForm />
        </div>
        <div>
          <h3>SignupForm</h3>
          <SignupForm />
        </div>
        <div>
          <h3>LogoutButton</h3>
          {/* only shows while signed in — an empty slot here is it working */}
          <LogoutButton />
        </div>
        <div>
          <h3>CreateHeistForm</h3>
          {/* it fetches the crew for the signed-in user, so this sits on the
              loader until you preview it while logged in */}
          <CreateHeistForm />
        </div>
      </div>
    </div>
  )
}
