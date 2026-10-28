import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import DownloadInvoiceButton from 'src/components/DownloadInvoiceButton'
import { renderWithTheme } from 'src/test/renderWithTheme'

const download = vi.fn()
const backend = vi.hoisted(() => ({ refusal: undefined as unknown }))
vi.mock('src/store/orders/actions', () => ({
  useDownloadInvoiceMutation: () => [(orderNumber: string) => ({ unwrap: () => (backend.refusal ? Promise.reject(backend.refusal) : download(orderNumber)) }), { isLoading: false }],
}))

describe('DownloadInvoiceButton', () => {
  beforeEach(() => {
    download.mockReset()
    backend.refusal = undefined
  })

  it('is off when there is no invoice yet', () => {
    renderWithTheme(<DownloadInvoiceButton orderNumber="ORD-2026-00125" available={false} />)

    expect(screen.getByRole('button', { name: 'Download invoice' })).toBeDisabled()
  })

  it('says why on hover when it is off', async () => {
    renderWithTheme(<DownloadInvoiceButton orderNumber="ORD-2026-00125" available={false} unavailableReason="A cancelled order has no invoice" />)

    await userEvent.hover(screen.getByRole('button', { name: 'Download invoice' }).parentElement!)

    expect(await screen.findByText('A cancelled order has no invoice')).toBeInTheDocument()
  })

  it('asks the backend for the order\'s invoice when it is on', async () => {
    download.mockResolvedValue(undefined)
    renderWithTheme(<DownloadInvoiceButton orderNumber="ORD-2026-00125" available />)

    await userEvent.click(screen.getByRole('button', { name: 'Download invoice' }))

    expect(download).toHaveBeenCalledWith('ORD-2026-00125')
  })

  it("shows the backend's reason when the download is refused", async () => {
    backend.refusal = { status: 409, code: 'ECB409', message: 'This order has no invoice yet' }
    renderWithTheme(<DownloadInvoiceButton orderNumber="ORD-2026-00125" available />)

    await userEvent.click(screen.getByRole('button', { name: 'Download invoice' }))

    expect(await screen.findByText('This order has no invoice yet')).toBeInTheDocument()
  })
})
