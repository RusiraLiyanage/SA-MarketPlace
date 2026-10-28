import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import PickList from 'src/pages/OrderFulfilment/components/PickList'
import { renderWithTheme } from 'src/test/renderWithTheme'

const lines = [
  { productName: 'Urine Collection Kit', sku: 'UCK-001', quantity: 2 },
  { productName: 'Oral Fluid Rapid Test', sku: 'OFT-002', quantity: 1 },
]

describe('PickList', () => {
  it('shows each line with its quantity and SKU, unticked', () => {
    renderWithTheme(<PickList lines={lines} mode="pick" picked={new Set()} onToggle={vi.fn()} onMarkAll={vi.fn()} />)

    expect(screen.getByRole('checkbox', { name: /Urine Collection Kit × 2/ })).not.toBeChecked()
    expect(screen.getByText('(OFT-002)')).toBeInTheDocument()
  })

  it('reports a tick by SKU', async () => {
    const onToggle = vi.fn()
    renderWithTheme(<PickList lines={lines} mode="pick" picked={new Set()} onToggle={onToggle} onMarkAll={vi.fn()} />)

    await userEvent.click(screen.getByRole('checkbox', { name: /Oral Fluid Rapid Test/ }))

    expect(onToggle).toHaveBeenCalledWith('OFT-002')
  })

  it('offers Mark all picked until everything is ticked', async () => {
    const onMarkAll = vi.fn()
    const { rerender } = renderWithTheme(<PickList lines={lines} mode="pick" picked={new Set(['UCK-001'])} onToggle={vi.fn()} onMarkAll={onMarkAll} />)

    await userEvent.click(screen.getByRole('button', { name: 'Mark all picked' }))
    expect(onMarkAll).toHaveBeenCalledOnce()

    rerender(<PickList lines={lines} mode="pick" picked={new Set(['UCK-001', 'OFT-002'])} onToggle={vi.fn()} onMarkAll={onMarkAll} />)
    expect(screen.queryByRole('button', { name: 'Mark all picked' })).not.toBeInTheDocument()
  })

  it('shows a dispatched order as picked and cannot be changed', () => {
    renderWithTheme(<PickList lines={lines} mode="packed" picked={new Set()} onToggle={vi.fn()} onMarkAll={vi.fn()} />)

    for (const box of screen.getAllByRole('checkbox')) {
      expect(box).toBeChecked()
      expect(box).toBeDisabled()
    }
    expect(screen.queryByRole('button', { name: 'Mark all picked' })).not.toBeInTheDocument()
  })

  it('shows a cancelled order as plain text', () => {
    renderWithTheme(<PickList lines={lines} mode="plain" picked={new Set()} onToggle={vi.fn()} onMarkAll={vi.fn()} />)

    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument()
    expect(screen.getByText(/Urine Collection Kit × 2/)).toBeInTheDocument()
  })
})
