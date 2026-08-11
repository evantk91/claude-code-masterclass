# Test Heists

Sample heists for populating the `heists` collection during testing, built to
exercise both the active and the expired lists.

`scripts/seedHeists.ts` holds the runnable copy of these tables — run `npm run
seed` to write all ten to Firestore. Edit both if you change one.

## Cast

The four generated users already in Firebase. `createdBy` and `assignedTo` store
the uid, while `createdByCodename` and `assignedToCodename` store the codename.

| Codename | uid |
|----------|-----|
| CunningTwilightHawk | `F1ajrG6YmDXTs4nYx2eCsZQzoDQ2` |
| SilentEchoJackal | `FmoFxXw3UqXlVxVL4FIQ6W2zp4s2` |
| MaskedPhantomLynx | `Kwnto0PdUqTwbhpF1Zg0br0rOpV2` |
| SilentPhantomWolf | `sLPxIITHgpV9J23y314fLATKZF32` |

## How the dates work

Every heist is dated backwards from whenever you run the seed, and the deadline
is always `heistDeadlineFrom(createdAt)` — 48 hours later. So anything created
more than 48 hours ago is already expired, and everything else is still live.
Re-running the seed re-dates them relative to the new "now".

Outcome and expiry are independent, which gives four states worth testing:

| | Unsettled | Settled |
|---|---|---|
| **Deadline ahead** | still in play | pulled off early |
| **Deadline passed** | ran the clock out | settled, now history |

No heist is assigned to the user who created it — the form excludes the
signed-in user from their own assignee list, so the seed holds to the same rule.

## Active heists — deadline still ahead

| # | Title | Created By | Assigned To | Created | Outcome | Description |
|---|-------|------------|-------------|---------|---------|-------------|
| 1 | Operation Decaf Dawn | CunningTwilightHawk | SilentEchoJackal | 2h ago | `null` | Swap the break room beans for decaf before the 9am standup. Nobody finds out until the meeting runs quiet. |
| 2 | The Stapler Redistribution | SilentEchoJackal | MaskedPhantomLynx | 6h ago | `null` | Third desk from the window has the only stapler that doesn't jam. Relocate it to the supply shelf, where it belongs to everyone. |
| 3 | Googly Protocol | MaskedPhantomLynx | SilentPhantomWolf | 18h ago | `success` | Every item in the conference room gets eyes. The projector, the plant, the whiteboard eraser. Leave nothing unwatched. |
| 4 | Ctrl+Alt+Betrayal | SilentPhantomWolf | CunningTwilightHawk | 40h ago | `null` | Find an unlocked laptop and set the wallpaper to a screenshot of that same desktop. Watch them click at nothing for a full minute. |
| 5 | The Great Mug Migration | CunningTwilightHawk | MaskedPhantomLynx | 47h ago | `failure` | Every mug in the kitchen moves one cupboard to the left. Report back with the first person to open the wrong door twice. |

Number 5 expires about an hour after you seed it — handy for watching a heist
cross from active to expired without waiting two days.

## Expired heists — deadline passed

| # | Title | Created By | Assigned To | Created | Outcome | Description |
|---|-------|------------|-------------|---------|---------|-------------|
| 6 | Thermostat Liberation Front | SilentEchoJackal | SilentPhantomWolf | 3d ago | `success` | It has been 64 degrees since March. Set it to something a mammal could survive, then hide the batteries. |
| 7 | Rubber Duck Surveillance | MaskedPhantomLynx | CunningTwilightHawk | 5d ago | `failure` | Place one rubber duck on the mark's desk each morning. Never more than one. Never acknowledge it. |
| 8 | Operation Sticky Season | SilentPhantomWolf | SilentEchoJackal | 8d ago | `null` | Cover a single keyboard entirely in sticky notes. Bonus points if the top layer spells out a compliment. |
| 9 | The Cake Recovery Job | CunningTwilightHawk | SilentPhantomWolf | 14d ago | `success` | The last slice in the fridge has a name on it. The name is now yours. Leave a handwritten receipt. |
| 10 | Chair Height Anarchy | SilentEchoJackal | CunningTwilightHawk | 30d ago | `failure` | Every chair on the floor drops to its lowest setting overnight. Deniability is essential. |

## Spread

- **5 active, 5 expired**
- **Outcomes:** 3 `success`, 3 `failure`, 4 `null`
- **All four states covered:** in play (1, 2, 4), pulled off early (3, 5),
  settled history (6, 7, 9, 10), clock run out (8)
- **Every agent both creates and receives**, so each has something in their own
  list and something in the list they assigned
