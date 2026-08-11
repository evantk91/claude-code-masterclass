import { render, screen, waitFor, act, fireEvent } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

// component imports
import CreateHeistForm from "@/components/CreateHeistForm"

const { useUser, listAssignableUsers, createHeist, push } = vi.hoisted(() => ({
  useUser: vi.fn(),
  listAssignableUsers: vi.fn(),
  createHeist: vi.fn(),
  push: vi.fn(),
}))

vi.mock("@/hooks/useUser", () => ({ default: useUser }))
vi.mock("@/lib/users/listAssignableUsers", () => ({ listAssignableUsers }))
vi.mock("@/lib/heists/createHeist", () => ({ createHeist }))
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }))

const ghost = { uid: "uid-1", email: "ghost@heist.dev", displayName: "GhostQuietOwl" }
const crow = { id: "uid-2", codename: "QuietMidnightCrow" }
const fox = { id: "uid-3", codename: "SilentShadowFox" }

// a promise the test resolves by hand, so a save can be held mid-flight
function deferred() {
  let resolve!: () => void
  const promise = new Promise<void>((res) => {
    resolve = res
  })

  return { promise, resolve }
}

// the crew loads on mount, so every test that wants the form waits for it
async function renderForm() {
  render(<CreateHeistForm />)

  return screen.findByRole("button", { name: "Create Heist" })
}

async function fillInHeist(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText("Title"), "Liberate the good stapler")
  await user.type(screen.getByLabelText("Description"), "Third desk from the window.")
  await user.selectOptions(screen.getByLabelText("Assign To"), "uid-2")
}

describe("CreateHeistForm", () => {
  beforeEach(() => {
    vi.resetAllMocks()

    useUser.mockReturnValue({ user: ghost, loading: false })
    listAssignableUsers.mockResolvedValue([crow, fox])
    createHeist.mockResolvedValue(undefined)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it("holds on the loader while the crew is still being fetched", () => {
    listAssignableUsers.mockReturnValue(new Promise(() => {}))

    render(<CreateHeistForm />)

    expect(screen.getByRole("status")).toBeInTheDocument()
    expect(screen.queryByLabelText("Title")).not.toBeInTheDocument()
  })

  it("renders the fields the user fills in", async () => {
    await renderForm()

    expect(screen.getByLabelText("Title")).toBeInTheDocument()
    expect(screen.getByLabelText("Description")).toBeInTheDocument()
    expect(screen.getByLabelText("Assign To")).toBeInTheDocument()
  })

  it("never asks for the values it fills in itself", async () => {
    await renderForm()

    expect(screen.queryByLabelText(/deadline/i)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/created/i)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/status/i)).not.toBeInTheDocument()
  })

  it("offers the crew as the people a heist can be pinned on", async () => {
    await renderForm()

    expect(screen.getByRole("option", { name: "QuietMidnightCrow" })).toBeInTheDocument()
    expect(screen.getByRole("option", { name: "SilentShadowFox" })).toBeInTheDocument()
  })

  it("leaves the signed-in user out of their own crew list", async () => {
    await renderForm()

    expect(listAssignableUsers).toHaveBeenCalledWith("uid-1")
    expect(screen.queryByRole("option", { name: "GhostQuietOwl" })).not.toBeInTheDocument()
  })

  it("says so when nobody else has signed up yet", async () => {
    listAssignableUsers.mockResolvedValue([])

    await renderForm()

    expect(
      screen.getByRole("option", { name: "Nobody else has signed up yet" }),
    ).toBeInTheDocument()
  })

  it("creates the heist from what the user filled in", async () => {
    const user = userEvent.setup()
    await renderForm()

    await fillInHeist(user)
    await user.click(screen.getByRole("button", { name: "Create Heist" }))

    expect(createHeist).toHaveBeenCalledWith({
      title: "Liberate the good stapler",
      description: "Third desk from the window.",
      createdBy: "uid-1",
      createdByCodename: "GhostQuietOwl",
      assignedTo: "uid-2",
      assignedToCodename: "QuietMidnightCrow",
    })
  })

  it("sends the user back to their heists once the job is on", async () => {
    const user = userEvent.setup()
    await renderForm()

    await fillInHeist(user)
    await user.click(screen.getByRole("button", { name: "Create Heist" }))

    await waitFor(() => {
      expect(push).toHaveBeenCalledWith("/heists")
    })
  })

  it("asks for the missing pieces rather than saving a half-built heist", async () => {
    const user = userEvent.setup()
    await renderForm()

    await user.type(screen.getByLabelText("Title"), "Liberate the good stapler")
    await user.click(screen.getByRole("button", { name: "Create Heist" }))

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "A heist needs a title, a description, and someone to pull it off.",
    )
    expect(createHeist).not.toHaveBeenCalled()
  })

  it("treats whitespace as a missing title", async () => {
    const user = userEvent.setup()
    await renderForm()

    await user.type(screen.getByLabelText("Title"), "   ")
    await user.type(screen.getByLabelText("Description"), "Third desk from the window.")
    await user.selectOptions(screen.getByLabelText("Assign To"), "uid-2")
    await user.click(screen.getByRole("button", { name: "Create Heist" }))

    expect(createHeist).not.toHaveBeenCalled()
  })

  it("shows why the heist could not be created and stays on the page", async () => {
    const user = userEvent.setup()
    createHeist.mockRejectedValue(new Error("We couldn't set up that heist. Please try again."))
    await renderForm()

    await fillInHeist(user)
    await user.click(screen.getByRole("button", { name: "Create Heist" }))

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "We couldn't set up that heist. Please try again.",
    )
    expect(push).not.toHaveBeenCalled()
  })

  it("lets the user try again after a failed save", async () => {
    const user = userEvent.setup()
    createHeist.mockRejectedValue(new Error("We couldn't set up that heist. Please try again."))
    await renderForm()

    await fillInHeist(user)
    await user.click(screen.getByRole("button", { name: "Create Heist" }))

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Create Heist" })).toBeEnabled()
    })
  })

  it("disables the submit button while the heist is being created", async () => {
    const user = userEvent.setup()
    const pending = deferred()
    createHeist.mockReturnValue(pending.promise)
    await renderForm()

    await fillInHeist(user)
    await user.click(screen.getByRole("button", { name: "Create Heist" }))

    expect(screen.getByRole("button", { name: "Create Heist" })).toBeDisabled()

    await act(async () => {
      pending.resolve()
    })
  })

  it("ignores a second submit while one is already in flight", async () => {
    const user = userEvent.setup()
    const pending = deferred()
    createHeist.mockReturnValue(pending.promise)
    const { container } = render(<CreateHeistForm />)
    await screen.findByRole("button", { name: "Create Heist" })

    await fillInHeist(user)
    await user.click(screen.getByRole("button", { name: "Create Heist" }))
    expect(createHeist).toHaveBeenCalledTimes(1)

    // submitting the form directly sidesteps the disabled button, leaving the
    // in-flight guard as the only thing standing in the way
    fireEvent.submit(container.querySelector("form")!)

    expect(createHeist).toHaveBeenCalledTimes(1)

    await act(async () => {
      pending.resolve()
    })
  })

  it("shows why the crew could not be loaded instead of an unusable form", async () => {
    listAssignableUsers.mockRejectedValue(
      new Error("We couldn't load your crew. Please try again."),
    )

    render(<CreateHeistForm />)

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "We couldn't load your crew. Please try again.",
    )
    expect(screen.queryByRole("button", { name: "Create Heist" })).not.toBeInTheDocument()
  })
})
