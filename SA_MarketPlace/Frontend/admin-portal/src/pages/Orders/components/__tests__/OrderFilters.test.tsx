import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import OrderFilters from 'src/pages/Orders/components/OrderFilters'
import { renderWithTheme } from 'src/test/renderWithTheme'

const show = (props: Partial<Parameters<typeof OrderFilters>[0]> = {}) => {
  const handlers = { onSearch: vi.fn(), onPaymentChange: vi.fn(), onFulfilmentChange: vi.fn() }
  renderWithTheme(<OrderFilters search="" payment="all" fulfilment="all" {...handlers} {...props} />)
  return handlers
}

describe('OrderFilters', () => {
  it('shows the search box and both filters, each saying what it filters', () => {
    show()

    expect(screen.getByRole('searchbox', { name: 'Search orders' })).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'Payment status' })).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'Fulfilment stage' })).toBeInTheDocument()
    expect(screen.getByText('Payment:')).toBeInTheDocument()
    expect(screen.getByText('Fulfilment:')).toBeInTheDocument()
  })

  it('reports a payment status chosen', async () => {
    const { onPaymentChange } = show()

    await userEvent.click(screen.getByRole('combobox', { name: 'Payment status' }))
    await userEvent.click(await screen.findByTitle('Refunded'))

    expect(onPaymentChange).toHaveBeenCalledWith('refunded')
  })

  it('reports a fulfilment stage chosen', async () => {
    const { onFulfilmentChange } = show()

    await userEvent.click(screen.getByRole('combobox', { name: 'Fulfilment stage' }))
    await userEvent.click(await screen.findByTitle('Dispatched'))

    expect(onFulfilmentChange).toHaveBeenCalledWith('dispatched')
  })

  it('searches on Enter, and again with nothing when the box is cleared', async () => {
    const { onSearch } = show({ search: 'mining' })

    const box = screen.getByRole('searchbox', { name: 'Search orders' })
    await userEvent.clear(box)
    expect(onSearch).toHaveBeenLastCalledWith('')

    await userEvent.type(box, '  ORD-2026-00125 {Enter}')
    expect(onSearch).toHaveBeenLastCalledWith('ORD-2026-00125')
  })
})
