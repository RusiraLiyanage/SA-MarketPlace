import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import SAPagination from 'src/components/SAPagination'
import type { PagingMeta } from 'src/infra/pagination'
import { renderWithTheme } from 'src/test/renderWithTheme'

const meta: PagingMeta = {
  page: 2,
  limit: 10,
  totalItem: 25,
  totalPage: 3,
  hasPreviousPage: true,
  hasNextPage: true,
}

describe('SAPagination', () => {
  afterEach(() => vi.restoreAllMocks())

  it('shows the position and the page size', () => {
    renderWithTheme(<SAPagination meta={meta} onChange={vi.fn()} />)

    expect(screen.getByText('2 of 3')).toBeInTheDocument()
    expect(screen.getByText('10 / page')).toBeInTheDocument()
  })

  it('keeps the page size when a page is chosen', async () => {
    const onChange = vi.fn()
    renderWithTheme(<SAPagination meta={meta} onChange={onChange} />)

    await userEvent.click(screen.getByTitle('3'))

    expect(onChange).toHaveBeenCalledWith(3, 10)
  })

  it('goes back to page 1 when the page size changes', async () => {
    const onChange = vi.fn()
    renderWithTheme(<SAPagination meta={meta} onChange={onChange} />)

    await userEvent.click(screen.getByRole('combobox', { name: 'Page size' }))
    await userEvent.click(await screen.findByTitle('20 / page'))

    expect(onChange).toHaveBeenCalledWith(1, 20)
  })

  it('shows 1 of 1 when there are no results', () => {
    renderWithTheme(
      <SAPagination meta={{ ...meta, page: 1, totalItem: 0, totalPage: 0 }} onChange={vi.fn()} />,
    )
    expect(screen.getByText('1 of 1')).toBeInTheDocument()
  })

  it('scrolls back to the top when a page or a page size is chosen', async () => {
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
    renderWithTheme(<SAPagination meta={meta} onChange={vi.fn()} />)

    await userEvent.click(screen.getByTitle('3'))
    expect(scrollTo).toHaveBeenCalledTimes(1)
    expect(scrollTo).toHaveBeenLastCalledWith({ top: 0 })

    await userEvent.click(screen.getByRole('combobox', { name: 'Page size' }))
    await userEvent.click(await screen.findByTitle('20 / page'))
    expect(scrollTo).toHaveBeenCalledTimes(2)
  })
})
