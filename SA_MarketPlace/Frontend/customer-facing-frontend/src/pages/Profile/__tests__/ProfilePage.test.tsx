import { act, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ProfilePage from 'src/pages/Profile'
import { renderWithRouter } from 'src/test/renderWithRouter'
import type { MyProfile } from 'src/types'

const update = vi.fn()
// Whether the profile has arrived yet; the real app shows a loading state first and renders again when it does.
const backend = vi.hoisted(() => ({ loaded: true }))
const profile: MyProfile = {
  email: 'j.shaw@saclinics.com.au',
  firstName: 'Jordan',
  lastName: 'Shaw',
  phone: '0412 000 001',
  organisationName: 'SA Clinics Pty Ltd',
  roles: ['buyer'],
  memberSince: '2026-01-05T00:00:00.000Z',
  ordersPlaced: 3,
  passwordLength: 12,
}
vi.mock('src/store/profile/actions', () => ({
  useGetProfileQuery: () => (backend.loaded ? { data: profile, refetch: vi.fn() } : { isLoading: true, refetch: vi.fn() }),
  useUpdateProfileMutation: () => [(body: unknown) => ({ unwrap: () => update(body) }), { isLoading: false }],
  useChangePasswordMutation: () => [vi.fn(), { isLoading: false }],
}))

const show = () =>
  renderWithRouter(<ProfilePage />, '/profile', [
    { path: '/profile/sign-out', element: <p>sign out pop-up</p> },
    { path: '/orders', element: <p>the orders page</p> },
  ])

const editFirstName = async () => {
  const name = screen.getByLabelText(/^First name/)
  await userEvent.clear(name)
  await userEvent.type(name, 'Jordan Lee')
}
const leave = (router: ReturnType<typeof show>) => act(async () => { await router.navigate('/orders') })
const inDialog = async (name: string) => userEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name }))

describe('ProfilePage: leaving with unsaved changes', () => {
  beforeEach(() => {
    update.mockReset()
    backend.loaded = true
  })

  it('does not ask when nothing was changed', async () => {
    const router = show()

    await leave(router)

    expect(router.state.location.pathname).toBe('/orders')
  })

  it('asks first, and stays on the page on Keep editing', async () => {
    const router = show()
    await editFirstName()

    await leave(router)

    expect(await screen.findByText('Save your changes?')).toBeInTheDocument()
    await inDialog('Keep editing')
    expect(router.state.location.pathname).toBe('/profile')
    expect(screen.getByLabelText(/^First name/)).toHaveValue('Jordan Lee')
  })

  it('leaves without saving on Discard changes', async () => {
    const router = show()
    await editFirstName()
    await leave(router)

    await inDialog('Discard changes')

    await waitFor(() => expect(router.state.location.pathname).toBe('/orders'))
    expect(update).not.toHaveBeenCalled()
  })

  it('saves what changed, then leaves, on Save changes', async () => {
    update.mockResolvedValue({})
    const router = show()
    await editFirstName()
    await leave(router)

    await inDialog('Save changes')

    await waitFor(() => expect(update).toHaveBeenCalledWith({ firstName: 'Jordan Lee' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/orders'))
  })

  it('stays, showing what is wrong, when the details cannot be saved yet', async () => {
    const router = show()
    const name = screen.getByLabelText(/^First name/)
    await userEvent.clear(name)
    await leave(router)

    await inDialog('Save changes')

    expect(await screen.findByText(/first name/i, { selector: '.ant-form-item-explain-error' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/profile')
    expect(update).not.toHaveBeenCalled()
  })

  it('does not ask for the sign-out pop-up, which belongs to the same page', async () => {
    const router = show()
    await editFirstName()

    await userEvent.click(screen.getByRole('button', { name: /sign out/i }))

    expect(router.state.location.pathname).toBe('/profile/sign-out')
    expect(screen.queryByText('Save your changes?')).not.toBeInTheDocument()
  })

  it('shows the form without crashing when the profile arrives after the page first rendered', async () => {
    backend.loaded = false
    const router = show()
    expect(screen.queryByLabelText(/^First name/)).not.toBeInTheDocument()

    backend.loaded = true
    await act(async () => {
      await router.navigate('/profile?loaded')
    })

    expect(await screen.findByLabelText(/^First name/)).toHaveValue('Jordan')
    await leave(router)
    expect(router.state.location.pathname).toBe('/orders')
  })
})
