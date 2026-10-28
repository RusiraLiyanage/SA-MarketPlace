import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import CatalogueTable from 'src/pages/Catalogue/components/CatalogueTable'
import type { CatalogueListItem } from 'src/store/catalogue/types'
import { renderWithRouter } from 'src/test/renderWithRouter'

const product = (overrides: Partial<CatalogueListItem> = {}): CatalogueListItem => ({
  id: 'p1',
  name: 'Urine Collection Kit - Standard',
  sku: 'UCK-001',
  price: '24.99',
  quantity: 450,
  listingStatus: 'published',
  ...overrides,
})

const show = (products: CatalogueListItem[], props: Partial<Parameters<typeof CatalogueTable>[0]> = {}) =>
  renderWithRouter(
    <CatalogueTable products={products} sortField="name" sortOrder="ASC" onSortChange={vi.fn()} onClearFilters={vi.fn()} {...props} />,
    '/catalogue',
  )

describe('CatalogueTable', () => {
  it('shows each product with its SKU, price, stock and status as plain text', () => {
    show([product()])

    expect(screen.getByText('Urine Collection Kit - Standard')).toBeInTheDocument()
    expect(screen.getByText('UCK-001')).toBeInTheDocument()
    expect(screen.getByText('$24.99')).toBeInTheDocument()
    expect(screen.getByText('450')).toBeInTheDocument()
    expect(screen.getByText('Published')).toBeInTheDocument()
  })

  it('has nothing to type into: price and stock change only on the edit page', () => {
    show([product(), product({ id: 'p2', listingStatus: 'draft' })])

    expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
  })

  it('links Edit to the product, and Retire opens the pop-up', async () => {
    const router = show([product()])

    expect(screen.getByRole('link', { name: 'Edit Urine Collection Kit - Standard' })).toHaveAttribute('href', '/catalogue/p1')
    await userEvent.click(screen.getByRole('button', { name: 'Retire Urine Collection Kit - Standard' }))

    expect(router.state.location.pathname).toBe('/catalogue/retire/p1')
  })

  it('takes the list\'s query to the retire pop-up, so closing it returns to the same view', async () => {
    const router = renderWithRouter(
      <CatalogueTable products={[product()]} sortField="name" sortOrder="ASC" onSortChange={vi.fn()} onClearFilters={vi.fn()} />,
      '/catalogue?search=kit&status=draft',
    )

    await userEvent.click(screen.getByRole('button', { name: 'Retire Urine Collection Kit - Standard' }))

    expect(router.state.location.pathname).toBe('/catalogue/retire/p1')
    expect(router.state.location.search).toBe('?search=kit&status=draft')
  })

  it('shows a retired product read-only, with View instead of Edit', () => {
    show([product({ listingStatus: 'retired' })])

    expect(screen.getByText('$24.99')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'View Urine Collection Kit - Standard' })).toBeInTheDocument()
    expect(screen.getByText('Read-only')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Retire/ })).not.toBeInTheDocument()
  })

  it('reports the column pressed to sort by', async () => {
    const onSortChange = vi.fn()
    show([product()], { onSortChange })

    await userEvent.click(screen.getByText('PRICE (GST INCL.)'))

    expect(onSortChange).toHaveBeenCalledWith({ orderField: 'price', order: 'ASC' })
  })

  it('says there are no products yet, and offers to add one', async () => {
    const router = show([])

    expect(screen.getByText('No products listed yet')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: '+ Add product' }))
    expect(router.state.location.pathname).toBe('/catalogue/new')
  })

  it('says nothing matches when a filter is on, and clears it', async () => {
    const onClearFilters = vi.fn()
    show([], { filtered: true, onClearFilters })

    expect(screen.getByText('No products match')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Clear filters' }))
    expect(onClearFilters).toHaveBeenCalledOnce()
  })
})
