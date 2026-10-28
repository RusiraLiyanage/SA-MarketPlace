import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import SAChipGroup from 'src/components/SAChipGroup'
import { renderWithTheme } from 'src/test/renderWithTheme'

const options = [
  { value: 'all', label: 'All' },
  { value: 'kits', label: 'Collection Kits' },
] as const

describe('SAChipGroup', () => {
  it('marks only the chosen chip as pressed', () => {
    renderWithTheme(<SAChipGroup label="Category" options={options} value="kits" onChange={vi.fn()} />)

    expect(screen.getByRole('button', { name: 'Collection Kits' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'All' })).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByRole('group', { name: 'Category' })).toBeInTheDocument()
  })

  it('reports the chip that was clicked', async () => {
    const onChange = vi.fn()
    renderWithTheme(<SAChipGroup label="Category" options={options} value="all" onChange={onChange} />)

    await userEvent.click(screen.getByRole('button', { name: 'Collection Kits' }))

    expect(onChange).toHaveBeenCalledWith('kits')
  })
})
