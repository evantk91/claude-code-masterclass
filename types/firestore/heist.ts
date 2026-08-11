import type { DocumentData, FieldValue, QueryDocumentSnapshot } from "firebase/firestore"

// how a heist ended — null until it has
export type HeistOutcome = "success" | "failure"

// every heist gets the same window to be pulled off in
export const HEIST_WINDOW_MS = 48 * 60 * 60 * 1000

export function heistDeadlineFrom(createdAt: Date): Date {
  return new Date(createdAt.getTime() + HEIST_WINDOW_MS)
}

// Document — what you read from Firestore (after conversion)
export interface Heist {
  id: string
  title: string
  description: string
  // the uid of whoever set the job up, alongside the codename to show for them
  createdBy: string
  createdByCodename: string
  // the uid of whoever is on the hook for it, and the codename to show
  assignedTo: string
  assignedToCodename: string
  createdAt: Date
  deadline: Date
  finalStatus: HeistOutcome | null
}

// Create Input — what you pass to addDoc
export interface CreateHeistInput {
  title: string
  description: string
  createdBy: string
  createdByCodename: string
  assignedTo: string
  assignedToCodename: string
  // serverTimestamp() — the clock that counts is Firestore's, not the client's
  createdAt: FieldValue
  // a real Date rather than a FieldValue: the deadline is 48h past creation,
  // and only a Cloud Function could do that arithmetic server-side
  deadline: Date
  // nothing has been pulled off yet
  finalStatus: null
}

// Update Input — partial fields for updateDoc (no createdAt)
export interface UpdateHeistInput {
  title?: string
  description?: string
  assignedTo?: string
  assignedToCodename?: string
  deadline?: Date
  finalStatus?: HeistOutcome | null
}

export const heistConverter = {
  toFirestore: (data: Partial<Heist>): DocumentData => data,

  fromFirestore: (snapshot: QueryDocumentSnapshot): Heist =>
    ({
      id: snapshot.id,
      ...snapshot.data(),
      // Firestore hands these back as Timestamps; the app works in Dates
      createdAt: snapshot.data().createdAt?.toDate(),
      deadline: snapshot.data().deadline?.toDate(),
    }) as Heist,
}
