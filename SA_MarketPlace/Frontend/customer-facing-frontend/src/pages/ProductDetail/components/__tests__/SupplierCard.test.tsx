import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import SupplierCard from 'src/pages/ProductDetail/components/SupplierCard'
import { renderWithTheme } from 'src/test/renderWithTheme'

describe('SupplierCard', () => {
  it('shows the supplier with an initial and says it is verified, with no rating', () => {
    renderWithTheme(<SupplierCard supplierName="Bindi Supplies" />)

    expect(screen.getByText('B')).toBeInTheDocument()
    expect(screen.getByText('Bindi Supplies')).toBeInTheDocument()
    expect(screen.getByText('Verified marketplace supplier')).toBeInTheDocument()
    expect(screen.queryByText(/positive/)).not.toBeInTheDocument()
  })
})
