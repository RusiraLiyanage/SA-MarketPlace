import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import DownloadInvoiceButton from 'src/components/DownloadInvoiceButton'
import SAOrderStatusTag from 'src/components/SAOrderStatusTag'
import { renderWithRouter } from 'src/test/renderWithRouter'

describe('SAOrderStatusTag', () => {
  it.each([
    ['new', 'New'],
    ['dispatched', 'Dispatched'],
    ['delivered', 'Delivered'],
    ['cancelled', 'Cancelled'],
  ] as const)('shows %s as "%s"', (status, label) => {
    renderWithRouter(<SAOrderStatusTag status={status} />)
    expect(screen.getByText(label)).toBeInTheDocument()
  })
})

describe('DownloadInvoiceButton', () => {
  it('is off when there is no invoice yet', () => {
    renderWithRouter(<DownloadInvoiceButton orderNumber="ORD-2026-00126" available={false} />)
    expect(screen.getByRole('button', { name: 'Download invoice' })).toBeDisabled()
  })

  it('is on once the order has dispatched', () => {
    renderWithRouter(<DownloadInvoiceButton orderNumber="ORD-2026-00126" available />)
    expect(screen.getByRole('button', { name: 'Download invoice' })).toBeEnabled()
  })
})
