import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Outlet } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import RejectSupplierModal from 'src/pages/Modals/RejectSupplierModal'
import { application } from 'src/test/applicationFixture'
import { renderWithRouter } from 'src/test/renderWithRouter'

const reject = vi.fn()
const backend = vi.hoisted(() => ({ refusal: undefined as unknown }))
vi.mock('src/store/suppliers/actions', () => ({
  useRejectSupplierMutation: () => [(arg: unknown) => ({ unwrap: () => (backend.refusal ? Promise.reject(backend.refusal) : reject(arg)) }), { isLoading: false }],
}))

const open = () =>
  renderWithRouter(<div />, '/suppliers/sup-1/reject', [
    {
      path: '/suppliers/:supplierId',
      element: <Outlet context={{ application: application() }} />,
      children: [{ path: 'reject', element: <RejectSupplierModal /> }],
    },
  ])

describe('RejectSupplierModal', () => {
  beforeEach(() => {
    reject.mockReset()
    backend.refusal = undefined
  })

  it('names the supplier who will be told, and what changes and stays', () => {
    open()

    expect(screen.getByRole('heading', { level: 2, name: 'Reject this application?' })).toBeInTheDocument()
    expect(screen.getByText('Bindi MedSupply Pty Ltd will be notified by email.')).toBeInTheDocument()
    expect(screen.getByText('The applicant is emailed your reason.')).toBeInTheDocument()
    expect(screen.getByText('They can update their details and resubmit at any time.')).toBeInTheDocument()
  })

  it('starts on "ABN could not be verified" and sends it with no detail', async () => {
    reject.mockResolvedValue({})
    const router = open()

    await userEvent.click(screen.getByRole('button', { name: 'Reject application' }))

    await vi.waitFor(() => expect(reject).toHaveBeenCalledWith({ supplierId: 'sup-1', reason: 'abn_not_verified', detail: undefined }))
    await vi.waitFor(() => expect(router.state.location.pathname).toBe('/suppliers/sup-1'))
    expect(await screen.findByText('Bindi MedSupply Pty Ltd rejected')).toBeInTheDocument()
  })

  it('sends the detail, trimmed', async () => {
    reject.mockResolvedValue({})
    open()

    await userEvent.type(screen.getByRole('textbox'), '  Digits do not match the ABN register. ')
    await userEvent.click(screen.getByRole('button', { name: 'Reject application' }))

    await vi.waitFor(() =>
      expect(reject).toHaveBeenCalledWith({ supplierId: 'sup-1', reason: 'abn_not_verified', detail: 'Digits do not match the ABN register.' }),
    )
  })

  it('needs a detail when the reason is "Other"', async () => {
    reject.mockResolvedValue({})
    open()

    await userEvent.click(screen.getByRole('combobox'))
    await userEvent.click(await screen.findByTitle('Other'))
    await userEvent.click(screen.getByRole('button', { name: 'Reject application' }))

    expect(await screen.findByText('Tell the applicant why')).toBeInTheDocument()
    expect(reject).not.toHaveBeenCalled()

    await userEvent.type(screen.getByRole('textbox'), 'Not a testing supplier')
    await userEvent.click(screen.getByRole('button', { name: 'Reject application' }))

    await vi.waitFor(() => expect(reject).toHaveBeenCalledWith({ supplierId: 'sup-1', reason: 'other', detail: 'Not a testing supplier' }))
  })

  it('keeps the application pending on Keep pending', async () => {
    const router = open()

    await userEvent.click(screen.getByRole('button', { name: 'Keep pending' }))

    expect(reject).not.toHaveBeenCalled()
    expect(router.state.location.pathname).toBe('/suppliers/sup-1')
  })

  it("stays open and shows the backend's reason when it was already decided", async () => {
    backend.refusal = { status: 409, code: 'ECB409', message: 'This application has already been approved or rejected' }
    const router = open()

    await userEvent.click(screen.getByRole('button', { name: 'Reject application' }))

    expect(await screen.findByText('This application has already been approved or rejected')).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/suppliers/sup-1/reject')
  })
})
