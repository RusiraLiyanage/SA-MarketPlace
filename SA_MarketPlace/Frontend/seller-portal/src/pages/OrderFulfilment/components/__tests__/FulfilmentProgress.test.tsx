import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import FulfilmentProgress from 'src/pages/OrderFulfilment/components/FulfilmentProgress'
import { renderWithTheme } from 'src/test/renderWithTheme'

describe('FulfilmentProgress', () => {
  it('lists the four steps', () => {
    renderWithTheme(<FulfilmentProgress order={{ status: 'new', cancellationReason: null }} />)

    for (const step of ['Received', 'Picking & Packing', 'Dispatched', 'Delivered']) {
      expect(screen.getByText(step)).toBeInTheDocument()
    }
  })

  it('shows the reason instead of the steps for a cancelled order', () => {
    renderWithTheme(<FulfilmentProgress order={{ status: 'cancelled', cancellationReason: 'Out of stock' }} />)

    expect(screen.getByText('This order was cancelled')).toBeInTheDocument()
    expect(screen.getByText('Out of stock')).toBeInTheDocument()
    expect(screen.queryByText('Picking & Packing')).not.toBeInTheDocument()
  })
})
