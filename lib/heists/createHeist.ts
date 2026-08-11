import { addDoc, collection, serverTimestamp } from "firebase/firestore"

// firebase
import { db } from "@/lib/firebase/config"

// types
import { COLLECTIONS, heistDeadlineFrom } from "@/types/firestore"
import type { CreateHeistInput } from "@/types/firestore"

const CREATION_FAILURE_MESSAGE = "We couldn't set up that heist. Please try again."

// what the form collects — the rest of the document is filled in here, so no
// caller can set a deadline or an outcome of its own
type NewHeist = {
  title: string
  description: string
  createdBy: string
  createdByCodename: string
  assignedTo: string
  assignedToCodename: string
}

export async function createHeist(heist: NewHeist): Promise<void> {
  const input: CreateHeistInput = {
    ...heist,
    createdAt: serverTimestamp(),
    // worked out here rather than server-side: nothing can do arithmetic on a
    // timestamp Firestore has not resolved yet short of a Cloud Function
    deadline: heistDeadlineFrom(new Date()),
    finalStatus: null,
  }

  try {
    // no converter on this write — heistConverter.toFirestore is typed against
    // Partial<Heist>, whose createdAt is a Date, while this sends a FieldValue
    await addDoc(collection(db, COLLECTIONS.HEISTS), input)
  } catch (cause) {
    throw new Error(CREATION_FAILURE_MESSAGE, { cause })
  }
}
