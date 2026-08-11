// Seeds the heists collection with the sample jobs listed in
// _test_heists/heists.md. Run it with `npm run seed`.
//
// This writes with addDoc rather than going through createHeist on purpose.
// createHeist fixes createdAt to the server clock, the deadline to 48 hours out
// and the outcome to null — exactly the guarantees the app wants and exactly
// what fixtures need to sidestep, since testing the expired list means backdating
// heists past their deadline and settling some of them. The 48-hour rule itself
// still comes from heistDeadlineFrom, so seeded windows match real ones.

import { addDoc, collection } from "firebase/firestore"

// firebase
import { db } from "@/lib/firebase/config"

// types
import { COLLECTIONS, heistDeadlineFrom } from "@/types/firestore"
import type { Heist, HeistOutcome } from "@/types/firestore"

type Agent = {
  uid: string
  codename: string
}

// the four generated users already in firebase
const HAWK: Agent = { uid: "F1ajrG6YmDXTs4nYx2eCsZQzoDQ2", codename: "CunningTwilightHawk" }
const JACKAL: Agent = { uid: "FmoFxXw3UqXlVxVL4FIQ6W2zp4s2", codename: "SilentEchoJackal" }
const LYNX: Agent = { uid: "Kwnto0PdUqTwbhpF1Zg0br0rOpV2", codename: "MaskedPhantomLynx" }
const WOLF: Agent = { uid: "sLPxIITHgpV9J23y314fLATKZF32", codename: "SilentPhantomWolf" }

type SeedHeist = {
  title: string
  description: string
  createdBy: Agent
  assignedTo: Agent
  // how far back to date the heist. Anything past 48 lands in the expired list,
  // because that is when heistDeadlineFrom puts the deadline behind us.
  hoursAgo: number
  finalStatus: HeistOutcome | null
}

const HOUR_MS = 60 * 60 * 1000

const HEISTS: SeedHeist[] = [
  // still in play — deadline ahead, nothing settled yet
  {
    title: "Operation Decaf Dawn",
    description:
      "Swap the break room beans for decaf before the 9am standup. Nobody finds out until the meeting runs quiet.",
    createdBy: HAWK,
    assignedTo: JACKAL,
    hoursAgo: 2,
    finalStatus: null,
  },
  {
    title: "The Stapler Redistribution",
    description:
      "Third desk from the window has the only stapler that doesn't jam. Relocate it to the supply shelf, where it belongs to everyone.",
    createdBy: JACKAL,
    assignedTo: LYNX,
    hoursAgo: 6,
    finalStatus: null,
  },
  // settled early — the clock has not run out, but the job is already done
  {
    title: "Googly Protocol",
    description:
      "Every item in the conference room gets eyes. The projector, the plant, the whiteboard eraser. Leave nothing unwatched.",
    createdBy: LYNX,
    assignedTo: WOLF,
    hoursAgo: 18,
    finalStatus: "success",
  },
  {
    title: "Ctrl+Alt+Betrayal",
    description:
      "Find an unlocked laptop and set the wallpaper to a screenshot of that same desktop. Watch them click at nothing for a full minute.",
    createdBy: WOLF,
    assignedTo: HAWK,
    hoursAgo: 40,
    finalStatus: null,
  },
  {
    title: "The Great Mug Migration",
    description:
      "Every mug in the kitchen moves one cupboard to the left. Report back with the first person to open the wrong door twice.",
    createdBy: HAWK,
    assignedTo: LYNX,
    hoursAgo: 47,
    finalStatus: "failure",
  },
  // expired — deadline behind us
  {
    title: "Thermostat Liberation Front",
    description:
      "It has been 64 degrees since March. Set it to something a mammal could survive, then hide the batteries.",
    createdBy: JACKAL,
    assignedTo: WOLF,
    hoursAgo: 72,
    finalStatus: "success",
  },
  {
    title: "Rubber Duck Surveillance",
    description:
      "Place one rubber duck on the mark's desk each morning. Never more than one. Never acknowledge it.",
    createdBy: LYNX,
    assignedTo: HAWK,
    hoursAgo: 120,
    finalStatus: "failure",
  },
  // ran the clock out without ever being settled
  {
    title: "Operation Sticky Season",
    description:
      "Cover a single keyboard entirely in sticky notes. Bonus points if the top layer spells out a compliment.",
    createdBy: WOLF,
    assignedTo: JACKAL,
    hoursAgo: 192,
    finalStatus: null,
  },
  {
    title: "The Cake Recovery Job",
    description:
      "The last slice in the fridge has a name on it. The name is now yours. Leave a handwritten receipt.",
    createdBy: HAWK,
    assignedTo: WOLF,
    hoursAgo: 336,
    finalStatus: "success",
  },
  {
    title: "Chair Height Anarchy",
    description:
      "Every chair on the floor drops to its lowest setting overnight. Deniability is essential.",
    createdBy: JACKAL,
    assignedTo: HAWK,
    hoursAgo: 720,
    finalStatus: "failure",
  },
]

async function seedHeists() {
  // the form never lets someone hand themselves a job, so neither does the
  // seed — checked up front rather than halfway through the writes
  const selfAssigned = HEISTS.filter((heist) => heist.createdBy.uid === heist.assignedTo.uid)

  if (selfAssigned.length > 0) {
    throw new Error(
      `These heists are assigned to their own creator: ${selfAssigned
        .map((heist) => heist.title)
        .join(", ")}`,
    )
  }

  const now = Date.now()
  let active = 0
  let expired = 0

  // written one at a time so a failure names the heist it stopped on
  for (const heist of HEISTS) {
    const createdAt = new Date(now - heist.hoursAgo * HOUR_MS)
    const deadline = heistDeadlineFrom(createdAt)

    // Omit<Heist, "id"> rather than CreateHeistInput: that one types createdAt
    // as a FieldValue for serverTimestamp(), and these dates are backdated
    const document: Omit<Heist, "id"> = {
      title: heist.title,
      description: heist.description,
      createdBy: heist.createdBy.uid,
      createdByCodename: heist.createdBy.codename,
      assignedTo: heist.assignedTo.uid,
      assignedToCodename: heist.assignedTo.codename,
      createdAt,
      deadline,
      finalStatus: heist.finalStatus,
    }

    await addDoc(collection(db, COLLECTIONS.HEISTS), document)

    const state = deadline.getTime() < now ? "expired" : "active"

    if (state === "expired") {
      expired++
    } else {
      active++
    }

    console.log(`seeded: ${heist.title} — ${state}, ${heist.finalStatus ?? "unsettled"}`)
  }

  console.log(`\nDone. ${HEISTS.length} heists added: ${active} active, ${expired} expired.`)
}

seedHeists()
  // the firebase client sdk keeps its connection open, so say when to stop
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\nSeeding stopped:", error)
    process.exit(1)
  })
