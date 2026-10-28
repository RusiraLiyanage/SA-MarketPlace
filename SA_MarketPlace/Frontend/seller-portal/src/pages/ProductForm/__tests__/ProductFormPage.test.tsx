import { screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ProductFormPage from 'src/pages/ProductForm'
import { useGetCategoriesQuery, useGetProductQuery } from 'src/store/catalogue/actions'
import { renderWithRouter } from 'src/test/renderWithRouter'

vi.mock('src/store/catalogue/actions', () => ({
  useGetCategoriesQuery: vi.fn(),
  useGetProductQuery: vi.fn(),
  useCreateProductMutation: () => [vi.fn(), { isLoading: false }],
  useEditProductMutation: () => [vi.fn(), { isLoading: false }],
}))

const categories = { data: [{ id: 'cat1', name: 'Collection Kits', children: [] }], isLoading: false, refetch: vi.fn() }

const product = {
  id: 'p1',
  name: 'Hair Follicle Test Kit',
  description: null,
  sku: 'HFT-003',
  price: '89.00',
  quantity: 12,
  lowStockThreshold: 20,
  listingStatus: 'draft',
  categoryId: 'cat1',
  brand: null,
  manufacturer: null,
  packSize: null,
  certification: null,
  images: [],
  category: { id: 'cat1', name: 'Collection Kits' },
  subCategory: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

const show = (path: string, queries: { categories?: object; product?: object }) => {
  vi.mocked(useGetCategoriesQuery).mockReturnValue({ ...categories, ...queries.categories } as unknown as ReturnType<typeof useGetCategoriesQuery>)
  vi.mocked(useGetProductQuery).mockReturnValue({ refetch: vi.fn(), ...queries.product } as unknown as ReturnType<typeof useGetProductQuery>)
  renderWithRouter(<div />, path, [
    { path: '/catalogue/new', element: <ProductFormPage /> },
    { path: '/catalogue/:productId', element: <ProductFormPage /> },
  ])
}

describe('ProductFormPage', () => {
  beforeEach(() => {
    vi.mocked(useGetCategoriesQuery).mockReset()
    vi.mocked(useGetProductQuery).mockReset()
  })

  it('shows an empty form for a new product, without asking for a product', () => {
    show('/catalogue/new', {})

    expect(screen.getByRole('heading', { level: 1, name: 'Add product' })).toBeInTheDocument()
    expect(vi.mocked(useGetProductQuery).mock.calls[0]![1]).toEqual({ skip: true })
  })

  it('shows the stored product for an edit', () => {
    show('/catalogue/p1', { product: { data: product } })

    expect(screen.getByRole('heading', { level: 1, name: 'Edit product' })).toBeInTheDocument()
    expect(screen.getByLabelText(/^SKU/)).toHaveValue('HFT-003')
  })

  it('shows a loading outline while the product or the categories load', () => {
    show('/catalogue/p1', { product: { isLoading: true } })
    expect(screen.getByRole('status', { name: 'Loading' })).toBeInTheDocument()
  })

  it('says so when the product does not exist or belongs to another seller', () => {
    show('/catalogue/p1', { product: { error: { status: 404, code: 'ECB404', message: 'Product not found' } } })
    expect(screen.getByText('Product not found')).toBeInTheDocument()
  })

  it('offers another try when the product cannot be loaded', () => {
    show('/catalogue/p1', { product: { error: { status: 0, code: 'NETWORK', message: 'Cannot reach the server.' } } })
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument()
  })

  it('offers another try when the categories cannot be loaded, instead of a form that cannot pick one', () => {
    show('/catalogue/new', { categories: { data: undefined, error: { status: 0, code: 'NETWORK', message: 'Cannot reach the server.' } } })
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument()
    expect(screen.queryByLabelText(/^Product name/)).not.toBeInTheDocument()
  })
})
