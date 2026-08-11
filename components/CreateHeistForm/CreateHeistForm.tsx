"use client"

import { useEffect, useState, type FormEvent } from "react"
import { useRouter } from "next/navigation"

// components
import FormCard from "@/components/FormCard"
import TextField from "@/components/TextField"
import TextAreaField from "@/components/TextAreaField"
import SelectField from "@/components/SelectField"
import Loader from "@/components/Loader"

// auth
import useUser from "@/hooks/useUser"

// firestore
import { createHeist } from "@/lib/heists/createHeist"
import { listAssignableUsers } from "@/lib/users/listAssignableUsers"
import type { UserProfile } from "@/types/firestore"

const FALLBACK_MESSAGE = "Something went wrong. Please try again."
const INCOMPLETE_MESSAGE = "A heist needs a title, a description, and someone to pull it off."

export default function CreateHeistForm() {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [assignedTo, setAssignedTo] = useState("")

  const [crew, setCrew] = useState<UserProfile[]>([])
  const [loadingCrew, setLoadingCrew] = useState(true)
  const [crewError, setCrewError] = useState<string | null>(null)

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // AuthGuard wraps the whole (dashboard) group, so there is always someone
  // signed in by the time this renders — the null checks below are belt-and-braces
  const { user } = useUser()
  const router = useRouter()

  useEffect(() => {
    if (!user) return

    // a resolved fetch must not write state into an unmounted form
    let cancelled = false

    listAssignableUsers(user.uid)
      .then((members) => {
        if (!cancelled) setCrew(members)
      })
      .catch((err) => {
        if (!cancelled) setCrewError(err instanceof Error ? err.message : FALLBACK_MESSAGE)
      })
      .finally(() => {
        if (!cancelled) setLoadingCrew(false)
      })

    return () => {
      cancelled = true
    }
  }, [user])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    // the button is disabled mid-flight too; this guards a submit that skips it
    if (isSubmitting || !user) return

    const heistTitle = title.trim()
    const heistDescription = description.trim()
    const assignee = crew.find((member) => member.id === assignedTo)

    if (!heistTitle || !heistDescription || !assignee) {
      setError(INCOMPLETE_MESSAGE)
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      await createHeist({
        title: heistTitle,
        description: heistDescription,
        createdBy: user.uid,
        createdByCodename: user.displayName ?? "",
        assignedTo: assignee.id,
        assignedToCodename: assignee.codename,
      })
      // left submitting on purpose — the page is on its way out
      router.push("/heists")
    } catch (err) {
      setError(err instanceof Error ? err.message : FALLBACK_MESSAGE)
      setIsSubmitting(false)
    }
  }

  if (loadingCrew) return <Loader />

  // no crew, no form — there would be nobody to pin the job on
  if (crewError) {
    return <p className="text-center text-sm text-error" role="alert">{crewError}</p>
  }

  return (
    <FormCard
      submitLabel="Create Heist"
      onSubmit={handleSubmit}
      error={error}
      submitting={isSubmitting}
    >
      <TextField label="Title" name="title" value={title} onChange={setTitle} />

      <TextAreaField
        label="Description"
        name="description"
        value={description}
        onChange={setDescription}
      />

      <SelectField
        label="Assign To"
        name="assignedTo"
        value={assignedTo}
        onChange={setAssignedTo}
        options={crew.map((member) => ({ value: member.id, label: member.codename }))}
        placeholder={crew.length ? "Pick your accomplice" : "Nobody else has signed up yet"}
      />
    </FormCard>
  )
}
