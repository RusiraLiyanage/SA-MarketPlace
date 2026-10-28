import { act, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ProfilePage from 'src/pages/Profile'
import type { MyAdminProfile } from 'src/store/profile/types'
import { renderWithRouter } from 'src/test/renderWithRouter'

const update = vi.fn()
const changePassword = vi.fn()
const refetch = vi.fn()
const backend = vi.hoisted(() => ({ refusal: undefined as unknown, query: {} as { data?: unknown; isLoading?: boolean; error?: unknown } }))
vi.mock('src/store/profile/actions', () => ({
  useGetProfileQuery: () => ({ refetch, ...backend.query }),
  useUpdateProfileMutation: () => [(body: unknown) => ({ unwrap: () => (backend.refusal ? Promise.reject(backend.refusal) : update(body)) }), { isLoading: false }],
  useChangePasswordMutation: () => [(body: unknown) => ({ unwrap: () => (backend.refusal ? Promise.reject(backend.refusal) : changePassword(body)) }), { isLoading: false }],
}))

const profile: MyAdminProfile = {
  fullName: 'Alex Morgan',
  email: 'a.morgan@sampleassist.com.au',
  roles: ['admin'],
  passwordLength: 12,
  memberSince: '2026-01-05T00:00:00.000Z',
  lastSignInAt: '2026-06-17T02:00:00.000Z',
}

const show = () =>
  renderWithRouter(<ProfilePage />, '/profile', [
    { path: '/profile/sign-out', element: <p>sign out pop-up</p> },
    { path: '/orders', element: <p>the orders page</p> },
  ])
const editName = async (value = 'Alex Jordan Morgan') => {
  const name = screen.getByLabelText(/^Full name/)
  await userEvent.clear(name)
  await userEvent.type(name, value)
}
const leave = (router: ReturnType<typeof show>) => act(async () => { await router.navigate('/orders') })
const inDialog = async (name: string) => userEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name }))

describe('ProfilePage', () => {
  beforeEach(() => {
    update.mockReset()
    changePassword.mockReset()
    refetch.mockReset()
    backend.refusal = undefined
    backend.query = { data: profile }
  })

  it('shows the account, with the role and the sign-in email read-only', () => {
    show()

    expect(screen.getByRole('heading', { level: 1, name: 'My profile' })).toBeInTheDocument()
    expect(screen.getByLabelText(/^Full name/)).toHaveValue('Alex Morgan')
    expect(screen.getByLabelText('Role')).toHaveValue('Administrator')
    expect(screen.getByLabelText('Role')).toBeDisabled()
    expect(screen.getByLabelText('Work email address')).toHaveValue('a.morgan@sampleassist.com.au')
    expect(screen.getByLabelText('Work email address')).toBeDisabled()
    expect(screen.getByLabelText('Current password')).toHaveValue('••••••••••••')
  })

  it('shows the form without crashing when the profile arrives after the page first rendered', async () => {
    backend.query = { isLoading: true }
    const router = show()
    expect(screen.queryByLabelText(/^Full name/)).not.toBeInTheDocument()

    // The request answers; the page renders again with the profile, and the form mounts for the first time.
    backend.query = { data: profile }
    await act(async () => {
      await router.navigate('/profile?loaded')
    })

    expect(await screen.findByLabelText(/^Full name/)).toHaveValue('Alex Morgan')
    await leave(router)
    expect(router.state.location.pathname).toBe('/orders')
  })

  it('summarises who is signed in, since when and the last sign-in', () => {
    show()

    const summary = within(screen.getByLabelText('Profile summary'))
    expect(summary.getByText('AM')).toBeInTheDocument()
    expect(summary.getByText('Administrator · Sample Assist')).toBeInTheDocument()
    expect(summary.getByText('Jan 2026')).toBeInTheDocument()
    expect(summary.getByText('17 Jun 2026, 12:00 PM')).toBeInTheDocument()
  })

  it('says so when no sign-in has been recorded yet', () => {
    backend.query = { data: { ...profile, lastSignInAt: null } }
    show()

    expect(screen.getByText('Not recorded yet')).toBeInTheDocument()
  })

  it('has no invitation card, which the backend dropped', () => {
    show()

    expect(screen.queryByText(/Invite administrator/)).not.toBeInTheDocument()
  })

  it('says there is nothing to save when nothing changed', async () => {
    show()

    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }))

    expect(await screen.findByText('There is nothing to save.')).toBeInTheDocument()
    expect(update).not.toHaveBeenCalled()
  })

  it('sends only the new name', async () => {
    update.mockResolvedValue({ ...profile, fullName: 'Alex Jordan Morgan' })
    show()

    await editName()
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }))

    await waitFor(() => expect(update).toHaveBeenCalledWith({ fullName: 'Alex Jordan Morgan' }))
    expect(await screen.findByText('Your details have been saved.')).toBeInTheDocument()
  })

  it('needs a first and last name', async () => {
    show()

    await editName('Alex')
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }))

    expect(await screen.findByText('Enter your first and last name')).toBeInTheDocument()
    expect(update).not.toHaveBeenCalled()
  })

  it('shows why a save was refused', async () => {
    backend.refusal = { status: 400, code: 'ECB001', message: 'Name is too long' }
    show()

    await editName()
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }))

    expect(await screen.findByText('Name is too long')).toBeInTheDocument()
  })

  it('changes the password, and clears the boxes afterwards', async () => {
    changePassword.mockResolvedValue({})
    show()

    await userEvent.type(screen.getByLabelText(/^New password/), 'Better#Pass1')
    await userEvent.type(screen.getByLabelText(/^Confirm new password/), 'Better#Pass1')
    await userEvent.click(screen.getByRole('button', { name: 'Update password' }))

    await waitFor(() => expect(changePassword).toHaveBeenCalledWith({ newPassword: 'Better#Pass1' }))
    expect(await screen.findByText('Password updated')).toBeInTheDocument()
    expect(screen.getByLabelText(/^New password/)).toHaveValue('')
  })

  it('does not change the password when the two boxes differ', async () => {
    show()

    await userEvent.type(screen.getByLabelText(/^New password/), 'Better#Pass1')
    await userEvent.type(screen.getByLabelText(/^Confirm new password/), 'Other#Pass1')
    await userEvent.click(screen.getByRole('button', { name: 'Update password' }))

    expect(await screen.findByText('Passwords do not match')).toBeInTheDocument()
    expect(changePassword).not.toHaveBeenCalled()
  })

  it('opens the sign-out pop-up', async () => {
    show()

    await userEvent.click(screen.getByRole('button', { name: 'Sign out' }))

    expect(await screen.findByText('sign out pop-up')).toBeInTheDocument()
  })

  it('shows the title but no form while it loads', () => {
    backend.query = { isLoading: true }
    show()

    expect(screen.getByRole('heading', { level: 1, name: 'My profile' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Save changes' })).not.toBeInTheDocument()
  })

  it('offers a retry when the profile could not be loaded', async () => {
    backend.query = { error: { status: 500, code: 'UNKNOWN', message: 'Something broke' } }
    show()

    expect(screen.getByText('We could not load your profile')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(refetch).toHaveBeenCalled()
  })

  describe('leaving with an unsaved name', () => {
    it('does not ask when nothing was changed', async () => {
      const router = show()

      await leave(router)

      expect(router.state.location.pathname).toBe('/orders')
    })

    it('asks first, and stays on the page on Keep editing', async () => {
      const router = show()
      await editName()

      await leave(router)

      expect(await screen.findByText('Save your changes?')).toBeInTheDocument()
      await inDialog('Keep editing')
      expect(router.state.location.pathname).toBe('/profile')
      expect(screen.getByLabelText(/^Full name/)).toHaveValue('Alex Jordan Morgan')
    })

    it('leaves without saving on Discard changes', async () => {
      const router = show()
      await editName()
      await leave(router)

      await inDialog('Discard changes')

      await waitFor(() => expect(router.state.location.pathname).toBe('/orders'))
      expect(update).not.toHaveBeenCalled()
    })

    it('saves, then leaves, on Save changes', async () => {
      update.mockResolvedValue({ ...profile, fullName: 'Alex Jordan Morgan' })
      const router = show()
      await editName()
      await leave(router)

      await inDialog('Save changes')

      await waitFor(() => expect(update).toHaveBeenCalledWith({ fullName: 'Alex Jordan Morgan' }))
      await waitFor(() => expect(router.state.location.pathname).toBe('/orders'))
    })

    it('stays, showing what is wrong, when the name cannot be saved yet', async () => {
      const router = show()
      await editName('Alex')
      await leave(router)

      await inDialog('Save changes')

      expect(await screen.findByText('Enter your first and last name')).toBeInTheDocument()
      expect(router.state.location.pathname).toBe('/profile')
      expect(update).not.toHaveBeenCalled()
    })

    it('does not ask for the sign-out pop-up, which belongs to the same page', async () => {
      const router = show()
      await editName()

      await userEvent.click(screen.getByRole('button', { name: 'Sign out' }))

      expect(router.state.location.pathname).toBe('/profile/sign-out')
      expect(screen.queryByText('Save your changes?')).not.toBeInTheDocument()
    })
  })
})
