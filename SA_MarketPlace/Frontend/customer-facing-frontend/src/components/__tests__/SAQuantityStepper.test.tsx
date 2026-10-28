import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import SAQuantityStepper from 'src/components/SAQuantityStepper'
import { renderWithTheme } from 'src/test/renderWithTheme'

describe('SAQuantityStepper', () => {
  it('shows the value and steps up and down by one', async () => {
    const onChange = vi.fn()
    renderWithTheme(<SAQuantityStepper value={2} onChange={onChange} />)

    expect(screen.getByRole('textbox', { name: 'Quantity' })).toHaveValue('2')
    await userEvent.click(screen.getByRole('button', { name: 'Increase quantity' }))
    await userEvent.click(screen.getByRole('button', { name: 'Decrease quantity' }))

    expect(onChange).toHaveBeenNthCalledWith(1, 3)
    expect(onChange).toHaveBeenNthCalledWith(2, 1)
  })

  it('reports 0 when reduced from 1, which is how an item is removed', async () => {
    const onChange = vi.fn()
    renderWithTheme(<SAQuantityStepper value={1} onChange={onChange} />)

    await userEvent.click(screen.getByRole('button', { name: 'Decrease quantity' }))

    expect(onChange).toHaveBeenCalledWith(0)
  })

  it('cannot go below the minimum or above the stock on hand', () => {
    const { unmount } = renderWithTheme(<SAQuantityStepper value={1} min={1} onChange={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Decrease quantity' })).toBeDisabled()
    unmount()

    renderWithTheme(<SAQuantityStepper value={5} max={5} onChange={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Increase quantity' })).toBeDisabled()
  })

  it('disables both buttons when disabled', () => {
    renderWithTheme(<SAQuantityStepper value={2} disabled onChange={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Decrease quantity' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Increase quantity' })).toBeDisabled()
  })

  it('shows a spinner on the pressed button and locks both until the change is done', async () => {
    let finish: () => void = () => {}
    const onChange = vi.fn(() => new Promise<void>((resolve) => (finish = resolve)))
    renderWithTheme(<SAQuantityStepper value={2} onChange={onChange} />)

    await userEvent.click(screen.getByRole('button', { name: 'Increase quantity' }))

    expect(screen.getByRole('button', { name: 'Increase quantity' })).toHaveClass('ant-btn-loading')
    expect(screen.getByRole('button', { name: 'Decrease quantity' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Decrease quantity' })).not.toHaveClass('ant-btn-loading')
    finish()

    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Increase quantity' })).toBeEnabled()
      expect(screen.getByRole('button', { name: 'Increase quantity' })).not.toHaveClass('ant-btn-loading')
    })
    expect(screen.getByRole('button', { name: 'Decrease quantity' })).toBeEnabled()
  })
})
