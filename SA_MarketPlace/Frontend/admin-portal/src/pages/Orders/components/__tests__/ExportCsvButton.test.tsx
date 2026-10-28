import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ExportCsvButton from 'src/pages/Orders/components/ExportCsvButton'
import { renderWithTheme } from 'src/test/renderWithTheme'

const exportOrders = vi.fn()
const backend = vi.hoisted(() => ({ refusal: undefined as unknown }))
vi.mock('src/store/orders/actions', () => ({
  useExportOrdersMutation: () => [(filter: unknown) => ({ unwrap: () => (backend.refusal ? Promise.reject(backend.refusal) : exportOrders(filter)) }), { isLoading: false }],
}))

const filter = { payment: 'paid', fulfilment: undefined, search: 'mining', orderField: 'placed_at', order: 'DESC' } as const

describe('ExportCsvButton', () => {
  beforeEach(() => {
    exportOrders.mockReset()
    backend.refusal = undefined
  })

  it('exports what the table shows, and says what was saved', async () => {
    exportOrders.mockResolvedValue('orders-2026-10-26.csv')
    renderWithTheme(<ExportCsvButton filter={filter} />)

    await userEvent.click(screen.getByRole('button', { name: /Export CSV/ }))

    await vi.waitFor(() => expect(exportOrders).toHaveBeenCalledWith(filter))
    expect(await screen.findByText('Saved orders-2026-10-26.csv')).toBeInTheDocument()
  })

  it("shows the backend's reason when the export is refused, for example it is too big", async () => {
    backend.refusal = { status: 400, code: 'ECB001', message: 'Too many orders to export (over 10,000). Narrow the filters.' }
    renderWithTheme(<ExportCsvButton filter={filter} />)

    await userEvent.click(screen.getByRole('button', { name: /Export CSV/ }))

    expect(await screen.findByText('Too many orders to export (over 10,000). Narrow the filters.')).toBeInTheDocument()
  })
})
