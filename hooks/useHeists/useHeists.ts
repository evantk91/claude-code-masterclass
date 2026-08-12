"use client"

import { useEffect, useState } from "react"
import { collection, onSnapshot, query, where } from "firebase/firestore"

// firebase
import { db } from "@/lib/firebase/config"

// auth
import useUser from "@/hooks/useUser"

// types
import { COLLECTIONS, HEIST_OUTCOMES, heistConverter } from "@/types/firestore"
import type { Heist, HeistMode } from "@/types/firestore"

// one shared empty array, so a hook with nothing to show returns the same
// reference every render rather than a fresh one
const NO_HEISTS: Heist[] = []

// both strict, so a deadline sitting exactly on the current instant counts as
// neither still-open nor expired — it falls out of every list for that tick
function isFutureDeadline(deadline: Date, now: Date): boolean {
  return deadline.getTime() > now.getTime()
}

function isPastDeadline(deadline: Date, now: Date): boolean {
  return deadline.getTime() < now.getTime()
}

// A live view of the heists collection, narrowed to one of three slices.
// Firestore is asked only for things it can answer with a single-field index —
// who a heist belongs to, whether it ended. The deadline is left to JS: pairing
// a range filter with those would need a composite index, and would freeze the
// current time into the subscription the moment it was opened.
export default function useHeists(mode: HeistMode): Heist[] {
  const { user } = useUser()
  const uid = user?.uid

  // expired belongs to nobody in particular, so it is the one mode that stands
  // up without a uid; the other two are only ever as good as who is signed in
  const key = mode === "expired" ? mode : `${mode}:${uid ?? ""}`

  // rows are stamped with the query that produced them. Anything carrying a
  // different stamp came from a listener that has since been torn down — a
  // sign-out, or a switch of user — and must not be handed back in its place
  const [result, setResult] = useState<{ key: string; heists: Heist[] }>({
    key: "",
    heists: NO_HEISTS,
  })

  useEffect(() => {
    // covers auth still resolving and nobody signed in alike: both leave the
    // two uid-scoped modes with nothing to match on, so never open a listener
    if (mode !== "expired" && !uid) return

    const heistsRef = collection(db, COLLECTIONS.HEISTS)

    // expired belongs to nobody in particular, so it goes unscoped by uid — but
    // it still asks only for heists that reached an outcome. An "in" counts as
    // an equality, so this stays a single-field query firestore indexes itself
    const target =
      mode === "active"
        ? query(heistsRef, where("assignedTo", "==", uid))
        : mode === "assigned"
          ? query(heistsRef, where("createdBy", "==", uid))
          : query(heistsRef, where("finalStatus", "in", HEIST_OUTCOMES))

    return onSnapshot(target, (snapshot) => {
      // one instant for the whole batch, so no two documents in a single
      // snapshot get judged against different clocks
      const now = new Date()

      // who a heist belongs to and whether it ended are settled by the query
      // above; all that is left to judge here is which side of now it falls on
      const matches = snapshot.docs
        // mapped by hand rather than through withConverter: the house converters
        // take a Partial in toFirestore, which firestore's generics reject
        .map((entry) => heistConverter.fromFirestore(entry))
        .filter((heist) =>
          mode === "expired"
            ? isPastDeadline(heist.deadline, now)
            : isFutureDeadline(heist.deadline, now),
        )

      setResult({ key, heists: matches })
    })
  }, [mode, uid, key])

  return result.key === key ? result.heists : NO_HEISTS
}
