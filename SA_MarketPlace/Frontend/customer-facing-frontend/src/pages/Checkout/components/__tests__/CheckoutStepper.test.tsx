import { screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import CheckoutStepper from 'src/pages/Checkout/components/CheckoutStepper'
import { renderWithRouter } from 'src/test/renderWithRouter'

const stepClass = (title: string) => screen.getByText(title).closest('.ant-steps-item')!.className

describe('CheckoutStepper', () => {
  it('lists the four steps', () => {
    renderWithRouter(<CheckoutStepper />, '/checkout/delivery')
    for (const title of ['Cart', 'Delivery', 'Payment', 'Confirmation']) expect(screen.getByText(title)).toBeInTheDocument()
  })

  it('is on Delivery with the cart done', () => {
    renderWithRouter(<CheckoutStepper />, '/checkout/delivery')
    expect(stepClass('Cart')).toContain('ant-steps-item-finish')
    expect(stepClass('Delivery')).toContain('ant-steps-item-process')
    expect(stepClass('Payment')).toContain('ant-steps-item-wait')
  })

  it('is on Payment with delivery done', () => {
    renderWithRouter(<CheckoutStepper />, '/checkout/payment')
    expect(stepClass('Delivery')).toContain('ant-steps-item-finish')
    expect(stepClass('Payment')).toContain('ant-steps-item-process')
  })
})
