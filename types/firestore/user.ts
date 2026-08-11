import type { DocumentData, QueryDocumentSnapshot } from "firebase/firestore"

// Document — a player as the rest of the office sees them: an id to pin work
// on, and the codename to show for them. Deliberately not named `User`:
// lib/auth/types.ts already owns that name for the Firebase Auth shape that
// useUser() returns, and the create-heist form needs both in the same file.
export interface UserProfile {
  id: string
  codename: string
}

export const userProfileConverter = {
  toFirestore: (data: Partial<UserProfile>): DocumentData => data,

  fromFirestore: (snapshot: QueryDocumentSnapshot): UserProfile =>
    ({
      ...snapshot.data(),
      // last, not first: these documents store an id of their own, and the
      // document they actually live at is the one that counts
      id: snapshot.id,
    }) as UserProfile,
}
