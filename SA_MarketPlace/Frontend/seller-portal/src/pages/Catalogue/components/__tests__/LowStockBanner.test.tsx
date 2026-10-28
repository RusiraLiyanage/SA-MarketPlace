import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import LowStockBanner from 'src/pages/Catalogue/components/LowStockBanner'
import { renderWithTheme } from 'src/test/renderWithTheme'

describe('LowStockBanner', () => {
  it('is not drawn when nothing is low', () => {
    renderWithTheme(<LowStockBanner lowStock={[]} />)
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('names the one product that is low', () => {
    renderWithTheme(<LowStockBanner lowStock={[{ id: '1', name: 'Hair Follicle Test Kit', quantity: 12 }]} />)
    expect(screen.getByText('Hair Follicle Test Kit is running low on stock (12 units left)')).toBeInTheDocument()
  })

  it('counts several and lists each', () => {
    renderWithTheme(
      <LowStockBanner
        lowStock={[
          { id: '1', name: 'Kit', quantity: 3 },
          { id: '2', name: 'Strips', quantity: 0 },
        ]}
      />,
    )

    expect(screen.getByText('2 products need restocking')).toBeInTheDocument()
    expect(screen.getByText('Strips is out of stock')).toBeInTheDocument()
  })
})
