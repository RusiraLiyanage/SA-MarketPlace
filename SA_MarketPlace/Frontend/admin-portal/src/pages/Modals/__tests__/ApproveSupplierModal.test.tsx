import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Outlet } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ApproveSupplierModal from 'src/pages/Modals/ApproveSupplierModal'
import { application } from 'src/test/applicationFixture'
import { renderWithRouter } from 'src/test/renderWithRouter'

const approve = vi.fn()
const backend = vi.hoisted(() => ({ refusal: undefined as unknown }))
vi.mock('src/store/suppliers/actions', () => ({
  useApproveSupplierMutation: () => [(id: string) => ({ unwrap: () => (backend.refusal ? Promise.reject(backend.refusal) : approve(id)) }), { isLoading: false }],
}))

const open = () =>
  renderWithRouter(<div />, '/suppliers/sup-1/approve', [
    {
      path: '/suppliers/:supplierId',
      element: <Outlet context={{ application: application() }} />,
      children: [{ path: 'approve', element: <ApproveSupplierModal /> }],
    },
  ])

describe('ApproveSupplierModal', () => {
  beforeEach(() => {
    approve.mockReset()
    backend.refusal = undefined
  })

  it('names the supplier, and says what approval does and that it cannot be undone here', () => {
    open()

    expect(screen.getByRole('heading', { level: 2, name: 'Approve Bindi MedSupply Pty Ltd?' })).toBeInTheDocument()
    expect(screen.getByText('Sent to priya@bindimedsupply.com.au, saying they can sign in now.')).toBeInTheDocument()
    expect(screen.getByText('Their published listings become visible to buyers.')).toBeInTheDocument()
    expect(screen.getByText('This cannot be undone here.')).toBeInTheDocument()
  })

  it('approves, then returns to the application', async () => {
    approve.mockResolvedValue({})
    const router = open()

    await userEvent.click(screen.getByRole('button', { name: 'Approve supplier' }))

    await vi.waitFor(() => expect(approve).toHaveBeenCalledWith('sup-1'))
    await vi.waitFor(() => expect(router.state.location.pathname).toBe('/suppliers/sup-1'))
    expect(await screen.findByText('Bindi MedSupply Pty Ltd approved')).toBeInTheDocument()
  })

  it('leaves the application alone on Cancel', async () => {
    const router = open()

    await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))

    expect(approve).not.toHaveBeenCalled()
    expect(router.state.location.pathname).toBe('/suppliers/sup-1')
  })

  it("stays open and shows the backend's reason when it was already decided", async () => {
    backend.refusal = { status: 409, code: 'ECB409', message: 'This application has already been approved or rejected' }
    const router = open()

    await userEvent.click(screen.getByRole('button', { name: 'Approve supplier' }))

    expect(await screen.findByText('This application has already been approved or rejected')).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/suppliers/sup-1/approve')
  })
})
