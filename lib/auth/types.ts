// The slice of Firebase's User this app actually needs. Keeping our own shape
// means components never depend on the SDK's type surface.
export type User = {
  uid: string
  email: string | null
  displayName: string | null
}

export type AuthContextValue = {
  // null whenever nobody is signed in — including before loading resolves
  user: User | null
  // true only until Firebase reports its first result; never flips back
  loading: boolean
}
