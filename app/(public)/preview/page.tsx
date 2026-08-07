// preview page for newly created UI components

import Skeleton from "@/components/Skeleton"
import LoginForm from "@/components/LoginForm"
import SignupForm from "@/components/SignupForm"

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
          <h3>LoginForm</h3>
          <LoginForm />
        </div>
        <div>
          <h3>SignupForm</h3>
          <SignupForm />
        </div>
      </div>
    </div>
  )
}
