import { act, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import BusinessProfilePage from 'src/pages/BusinessProfile'
import type { BusinessProfile } from 'src/store/profile/types'
import { renderWithRouter } from 'src/test/renderWithRouter'

const update = vi.fn()
const changePassword = vi.fn()
const refetch = vi.fn()
const backend = vi.hoisted(() => ({
  refusal: undefined as unknown,
  query: {} as { data?: unknown; isLoading?: boolean; error?: unknown },
}))
vi.mock('src/store/profile/actions', () => ({
  useGetProfileQuery: () => ({ refetch, ...backend.query }),
  useUpdateProfileMutation: () => [(body: unknown) => ({ unwrap: () => (backend.refusal ? Promise.reject(backend.refusal) : update(body)) }), { isLoading: false }],
  useChangePasswordMutation: () => [(body: unknown) => ({ unwrap: () => (backend.refusal ? Promise.reject(backend.refusal) : changePassword(body)) }), { isLoading: false }],
}))

const profile: BusinessProfile = {
  business: { businessName: 'Bindi MedSupply Pty Ltd', abn: '51824753556', businessType: 'Wholesaler' },
  contact: { contactName: 'Priya Nair', phone: '0412 000 002' },
  productCategories: ['Collection Kits'],
  email: 'priya@bindimedsupply.com.au',
  passwordLength: 12,
  fulfilment: { dispatchSlaHours: 24, defaultCarrier: 'Australia Post' },
  verification: { status: 'approved', approvedAt: '2026-06-02T03:00:00.000Z' },
}

const show = () =>
  renderWithRouter(<BusinessProfilePage />, '/profile', [
    { path: '/profile/sign-out', element: <p>sign out pop-up</p> },
    { path: '/orders', element: <p>the orders page</p> },
  ])

describe('BusinessProfilePage', () => {
  beforeEach(() => {
    update.mockReset()
    changePassword.mockReset()
    refetch.mockReset()
    backend.refusal = undefined
    backend.query = { data: profile }
  })

  it('shows the profile, with the identity Sample Assist verified read-only', () => {
    show()

    expect(screen.getByRole('heading', { level: 1, name: 'Business profile' })).toBeInTheDocument()
    expect(screen.getByText('Verified supplier')).toBeInTheDocument()
    expect(screen.getByLabelText('Business / trading name')).toBeDisabled()
    expect(screen.getByLabelText('ABN')).toHaveValue('51 824 753 556')
    expect(screen.getByLabelText('ABN')).toBeDisabled()
    expect(screen.getByLabelText('Sign-in email')).toHaveValue('priya@bindimedsupply.com.au')
    expect(screen.getByLabelText('Sign-in email')).toBeDisabled()
    expect(screen.getByText('Collection Kits')).toBeInTheDocument()
    expect(screen.getByLabelText(/^Contact name/)).toHaveValue('Priya Nair')
    expect(screen.getByLabelText(/^Dispatch SLA/)).toHaveValue('24')
    expect(screen.getByLabelText('Current password')).toHaveValue('••••••••••••')
  })

  it('says there is nothing to save when nothing changed', async () => {
    show()

    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }))

    expect(await screen.findByText('There are no changes to save')).toBeInTheDocument()
    expect(update).not.toHaveBeenCalled()
  })

  it('sends only the field that changed', async () => {
    update.mockResolvedValue({ ...profile, fulfilment: { ...profile.fulfilment, defaultCarrier: 'Sendle' } })
    show()

    const carrier = screen.getByLabelText(/^Default carrier/)
    await userEvent.clear(carrier)
    await userEvent.type(carrier, 'Sendle')
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }))

    await waitFor(() => expect(update).toHaveBeenCalledWith({ defaultCarrier: 'Sendle' }))
    expect(await screen.findByText('Profile saved')).toBeInTheDocument()
  })

  it('checks the contact before saving', async () => {
    show()

    const name = screen.getByLabelText(/^Contact name/)
    await userEvent.clear(name)
    await userEvent.type(name, 'Priya')
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }))

    expect(await screen.findByText('Enter your first and last name')).toBeInTheDocument()
    expect(update).not.toHaveBeenCalled()
  })

  it('shows why a save was refused', async () => {
    backend.refusal = { status: 400, code: 'ECB400', message: 'Phone number is not valid' }
    show()

    const phone = screen.getByLabelText(/^Phone number/)
    await userEvent.clear(phone)
    await userEvent.type(phone, '123')
    await userEvent.click(screen.getByRole('button', { name: 'Save changes' }))

    expect(await screen.findByText('Phone number is not valid')).toBeInTheDocument()
    expect(update).not.toHaveBeenCalled()
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

  it('does not change the password when the two boxes differ or the rule is not met', async () => {
    show()

    await userEvent.type(screen.getByLabelText(/^New password/), 'weak')
    await userEvent.type(screen.getByLabelText(/^Confirm new password/), 'other')
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

    expect(screen.getByRole('heading', { level: 1, name: 'Business profile' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Save changes' })).not.toBeInTheDocument()
  })

  it('offers a retry when the profile could not be loaded', async () => {
    backend.query = { error: { status: 500, code: 'UNKNOWN', message: 'Something broke' } }
    show()

    expect(screen.getByText('We could not load your business profile')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(refetch).toHaveBeenCalled()
  })

  describe('leaving with unsaved changes', () => {
    const editCarrier = async () => {
      const carrier = screen.getByLabelText(/^Default carrier/)
      await userEvent.clear(carrier)
      await userEvent.type(carrier, 'Sendle')
    }
    const goToOrders = (router: ReturnType<typeof show>) => act(async () => { await router.navigate('/orders') })

    it('does not ask when nothing was changed', async () => {
      const router = show()

      await goToOrders(router)

      expect(router.state.location.pathname).toBe('/orders')
      expect(screen.queryByText('Save your changes?')).not.toBeInTheDocument()
    })

    it('asks first, and stays on the page on Keep editing', async () => {
      const router = show()
      await editCarrier()

      await goToOrders(router)

      expect(await screen.findByText('Save your changes?')).toBeInTheDocument()
      await userEvent.click(screen.getByRole('button', { name: 'Keep editing' }))
      expect(router.state.location.pathname).toBe('/profile')
      expect(screen.getByLabelText(/^Default carrier/)).toHaveValue('Sendle')
    })

    it('leaves without saving on Discard changes', async () => {
      const router = show()
      await editCarrier()
      await goToOrders(router)

      await userEvent.click(await screen.findByRole('button', { name: 'Discard changes' }))

      await waitFor(() => expect(router.state.location.pathname).toBe('/orders'))
      expect(update).not.toHaveBeenCalled()
    })

    it('saves, then leaves, on Save changes', async () => {
      update.mockResolvedValue({ ...profile, fulfilment: { ...profile.fulfilment, defaultCarrier: 'Sendle' } })
      const router = show()
      await editCarrier()
      await goToOrders(router)

      await userEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Save changes' }))

      await waitFor(() => expect(update).toHaveBeenCalledWith({ defaultCarrier: 'Sendle' }))
      await waitFor(() => expect(router.state.location.pathname).toBe('/orders'))
    })

    it('stays on the page when the save cannot be done, so it can be fixed', async () => {
      const router = show()
      const name = screen.getByLabelText(/^Contact name/)
      await userEvent.clear(name)
      await userEvent.type(name, 'Priya')
      await goToOrders(router)

      await userEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'Save changes' }))

      expect(await screen.findByText('Enter your first and last name')).toBeInTheDocument()
      expect(router.state.location.pathname).toBe('/profile')
      expect(update).not.toHaveBeenCalled()
    })

    it('does not ask for the sign-out pop-up, which belongs to the same page', async () => {
      const router = show()
      await editCarrier()

      await userEvent.click(screen.getByRole('button', { name: 'Sign out' }))

      expect(router.state.location.pathname).toBe('/profile/sign-out')
      expect(screen.queryByText('Save your changes?')).not.toBeInTheDocument()
    })
  })
})
