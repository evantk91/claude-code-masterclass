import { collection, getDocs } from "firebase/firestore"

// firebase
import { db } from "@/lib/firebase/config"

// types
import { COLLECTIONS, userProfileConverter } from "@/types/firestore"
import type { UserProfile } from "@/types/firestore"

const LOAD_FAILURE_MESSAGE = "We couldn't load your crew. Please try again."

// Everyone a heist can be pinned on — that is, everyone but whoever is setting
// it up. The whole collection comes back rather than an inequality query: the
// crew is small, and the rule reads plainer (and tests plainer) as JS.
export async function listAssignableUsers(excludeUid: string): Promise<UserProfile[]> {
  try {
    const snapshot = await getDocs(collection(db, COLLECTIONS.USERS))

    return snapshot.docs
      // mapped by hand rather than through withConverter: the house converters
      // take a Partial in toFirestore, which firestore's generics reject
      .map((entry) => userProfileConverter.fromFirestore(entry))
      .filter((member) => member.id !== excludeUid)
      .sort((a, b) => a.codename.localeCompare(b.codename))
  } catch (cause) {
    throw new Error(LOAD_FAILURE_MESSAGE, { cause })
  }
}
