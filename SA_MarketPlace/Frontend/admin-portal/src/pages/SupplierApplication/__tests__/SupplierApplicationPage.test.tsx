import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import SupplierApplicationPage from 'src/pages/SupplierApplication'
import { useGetSupplierApplicationQuery } from 'src/store/suppliers/actions'
import { application } from 'src/test/applicationFixture'
import { renderWithRouter } from 'src/test/renderWithRouter'

vi.mock('src/store/suppliers/actions', () => ({ useGetSupplierApplicationQuery: vi.fn() }))

const refetch = vi.fn()
const result = (value: object) => vi.mocked(useGetSupplierApplicationQuery).mockReturnValue({ refetch, ...value } as unknown as ReturnType<typeof useGetSupplierApplicationQuery>)
const show = () =>
  renderWithRouter(<div />, '/suppliers/sup-1', [
    { path: '/suppliers/:supplierId', element: <SupplierApplicationPage /> },
    { path: '/suppliers', element: <p>the queue</p> },
  ])

describe('SupplierApplicationPage', () => {
  beforeEach(() => {
    refetch.mockReset()
    vi.mocked(useGetSupplierApplicationQuery).mockReset()
  })

  it('asks the backend for the application in the address', () => {
    result({ currentData: application() })
    show()

    expect(useGetSupplierApplicationQuery).toHaveBeenCalledWith('sup-1')
    expect(screen.getByText('Bindi MedSupply Pty Ltd')).toBeInTheDocument()
  })

  it('shows the title but no details while it loads', () => {
    result({ isFetching: true })
    show()

    expect(screen.getByRole('heading', { level: 1, name: 'Supplier application' })).toBeInTheDocument()
    expect(screen.queryByText('Business details')).not.toBeInTheDocument()
  })

  it('says it was not found, with a way back, for a missing application', async () => {
    result({ error: { status: 404, code: 'ECB404', message: 'Supplier application not found' } })
    const router = show()

    expect(screen.getByText('Application not found')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Back to suppliers' }))
    expect(router.state.location.pathname).toBe('/suppliers')
  })

  it('offers a retry for any other failure', async () => {
    result({ error: { status: 500, code: 'UNKNOWN', message: 'Something broke' } })
    show()

    expect(screen.getByText('We could not load this application')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(refetch).toHaveBeenCalled()
  })

  it("never shows the previous application's details for a link that failed", () => {
    // What RTK Query hands back after moving to an id that does not exist: the old result in `data`, the new failure in `error`.
    result({ data: application(), error: { status: 404, code: 'ECB404', message: 'Supplier application not found' } })
    show()

    expect(screen.getByText('Application not found')).toBeInTheDocument()
    expect(screen.queryByText('Bindi MedSupply Pty Ltd')).not.toBeInTheDocument()
  })
})
