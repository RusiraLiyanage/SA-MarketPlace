import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import OrderProgressSteps from 'src/pages/OrderDetail/components/OrderProgressSteps'
import { renderWithRouter } from 'src/test/renderWithRouter'
import type { OrderStatus } from 'src/types'

// Counts the steps drawn as done: they are the ones with a tick.
const doneSteps = () => document.querySelectorAll('.ant-steps-item-finish').length

describe('OrderProgressSteps', () => {
  it.each<[OrderStatus, number]>([
    ['placed', 1],
    ['confirmed', 2],
    ['picking', 2],
    ['dispatched', 3],
    ['delivered', 4],
  ])('a %s order has %i step(s) done', (status, done) => {
    renderWithRouter(<OrderProgressSteps status={status} cancellationReason={null} />)

    expect(screen.getByText('Order placed')).toBeInTheDocument()
    expect(screen.getByText('Delivered')).toBeInTheDocument()
    expect(doneSteps()).toBe(done)
  })

  it('shows the reason instead of the steps when the order was cancelled', () => {
    renderWithRouter(<OrderProgressSteps status="cancelled" cancellationReason="Out of stock" />)

    expect(screen.getByText('This order was cancelled')).toBeInTheDocument()
    expect(screen.getByText('Reason: Out of stock')).toBeInTheDocument()
    expect(screen.queryByText('Dispatched')).not.toBeInTheDocument()
  })
})
