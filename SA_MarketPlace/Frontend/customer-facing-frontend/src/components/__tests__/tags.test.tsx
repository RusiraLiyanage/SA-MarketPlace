import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import SAStatusTag from 'src/components/SAStatusTag'
import SAStockTag from 'src/components/SAStockTag'
import { renderWithTheme } from 'src/test/renderWithTheme'

describe('SAStockTag', () => {
  it.each([
    ['in_stock', 'In Stock'],
    ['low_stock', 'Low Stock'],
    ['out_of_stock', 'Out of Stock'],
  ] as const)('labels %s as %s', (status, label) => {
    renderWithTheme(<SAStockTag status={status} />)
    expect(screen.getByText(label)).toBeInTheDocument()
  })
})

describe('SAStatusTag', () => {
  it.each([
    ['placed', 'Placed'],
    ['confirmed', 'Confirmed'],
    ['dispatched', 'Dispatched'],
    ['delivered', 'Delivered'],
    ['cancelled', 'Cancelled'],
  ] as const)('labels %s as %s', (status, label) => {
    renderWithTheme(<SAStatusTag status={status} />)
    expect(screen.getByText(label)).toBeInTheDocument()
  })

  it('shows the seller-only picking step as Confirmed', () => {
    renderWithTheme(<SAStatusTag status="picking" />)
    expect(screen.getByText('Confirmed')).toBeInTheDocument()
  })
})
