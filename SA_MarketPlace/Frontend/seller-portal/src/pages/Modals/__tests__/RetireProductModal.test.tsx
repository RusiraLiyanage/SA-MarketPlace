import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Outlet } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import RetireProductModal from 'src/pages/Modals/RetireProductModal'
import { renderWithRouter } from 'src/test/renderWithRouter'

const retire = vi.fn()
const backend = vi.hoisted(() => ({ refusal: undefined as unknown, product: undefined as unknown }))
vi.mock('src/store/catalogue/actions', () => ({
  useGetProductQuery: () => ({ data: backend.product }),
  useRetireProductMutation: () => [(id: string) => ({ unwrap: () => (backend.refusal ? Promise.reject(backend.refusal) : retire(id)) }), { isLoading: false }],
}))

const products = [{ id: 'p1', name: 'Hair Follicle Test Kit', sku: 'HFT-003', price: '89.00', quantity: 12, listingStatus: 'published' as const }]

const open = (path = '/catalogue/retire/p1') =>
  renderWithRouter(<div />, path, [
    {
      path: '/catalogue',
      element: <Outlet context={{ products }} />,
      children: [{ path: 'retire/:productId', element: <RetireProductModal /> }],
    },
  ])

describe('RetireProductModal', () => {
  beforeEach(() => {
    retire.mockReset()
    backend.refusal = undefined
    backend.product = { category: { id: 'cat1', name: 'Collection Kits' } }
  })

  it('names the product, with its SKU, category and status', () => {
    open()

    expect(screen.getByRole('dialog', { name: /Retire Hair Follicle Test Kit\?/ })).toBeInTheDocument()
    expect(screen.getByText('HFT-003 · Collection Kits · currently Published')).toBeInTheDocument()
  })

  it('leaves the category out until the product has loaded', () => {
    backend.product = undefined
    open()

    expect(screen.getByText('HFT-003 · currently Published')).toBeInTheDocument()
  })

  it('says what changes, what stays the same, and that it cannot be undone', () => {
    open()

    expect(screen.getByText('What changes')).toBeInTheDocument()
    expect(screen.getByText('Buyers can no longer find or buy it.')).toBeInTheDocument()
    expect(screen.getByText(/Carts holding it say/)).toBeInTheDocument()
    expect(screen.getByText('SKU HFT-003 stays reserved so your records stay accurate.')).toBeInTheDocument()
    expect(screen.getByText('What stays the same')).toBeInTheDocument()
    expect(screen.getByText('Orders already placed are not affected.')).toBeInTheDocument()
    expect(screen.getByText('This cannot be undone.')).toBeInTheDocument()
  })

  it('retires the product, then shows the Retired tab with a note carrying its name', async () => {
    retire.mockResolvedValue({})
    const router = open()

    await userEvent.click(screen.getByRole('button', { name: 'Retire product' }))

    await vi.waitFor(() => expect(retire).toHaveBeenCalledWith('p1'))
    await vi.waitFor(() => expect(router.state.location.pathname).toBe('/catalogue'))
    expect(router.state.location.search).toBe('?status=retired')
    expect(router.state.location.state).toEqual({ retired: 'Hair Follicle Test Kit' })
  })

  it('stays open and shows the backend\'s reason when the retire is refused', async () => {
    backend.refusal = { status: 409, code: 'ECB409', message: 'This product is already retired' }
    const router = open()

    await userEvent.click(screen.getByRole('button', { name: 'Retire product' }))

    expect(await screen.findByText('This product is already retired')).toBeInTheDocument()
    expect(router.state.location.pathname).toBe('/catalogue/retire/p1')
  })

  it('leaves the product alone on Keep product', async () => {
    const router = open()

    await userEvent.click(screen.getByRole('button', { name: 'Keep product' }))

    expect(retire).not.toHaveBeenCalled()
    expect(router.state.location.pathname).toBe('/catalogue')
  })

  it('returns to the list as the seller left it, with the search, status and page kept', async () => {
    const router = open('/catalogue/retire/p1?search=kit&status=draft&page=2')

    await userEvent.click(screen.getByRole('button', { name: 'Keep product' }))

    expect(router.state.location.pathname).toBe('/catalogue')
    expect(router.state.location.search).toBe('?search=kit&status=draft&page=2')
  })
})
