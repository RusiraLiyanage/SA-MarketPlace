import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import SATable from 'src/components/SATable'
import type { PagingMeta } from 'src/infra/pagination'
import { renderWithTheme } from 'src/test/renderWithTheme'

interface Row {
  id: string
  name: string
}

const columns = [{ title: 'Name', dataIndex: 'name', sorter: true }]
const rows: Row[] = [
  { id: '1', name: 'Urine Collection Kit' },
  { id: '2', name: 'Oral Fluid Rapid Test' },
]
const meta: PagingMeta = { page: 1, limit: 10, totalItem: 25, totalPage: 3, hasPreviousPage: false, hasNextPage: true }

describe('SATable', () => {
  it('renders the rows', () => {
    renderWithTheme(<SATable<Row> rowKey="id" columns={columns} dataSource={rows} />)

    expect(screen.getByText('Urine Collection Kit')).toBeInTheDocument()
    expect(screen.getByText('Oral Fluid Rapid Test')).toBeInTheDocument()
  })

  it('has no pager without meta', () => {
    renderWithTheme(<SATable<Row> rowKey="id" columns={columns} dataSource={rows} />)
    expect(screen.queryByRole('list', { name: /pagination/i })).not.toBeInTheDocument()
    expect(screen.queryByTitle('2')).not.toBeInTheDocument()
  })

  it('asks for the next page with the same page size', async () => {
    const onMetaChange = vi.fn()
    renderWithTheme(
      <SATable<Row> rowKey="id" columns={columns} dataSource={rows} meta={meta} onMetaChange={onMetaChange} />,
    )

    await userEvent.click(screen.getByTitle('2'))

    expect(onMetaChange).toHaveBeenCalledWith(expect.objectContaining({ page: 2, limit: 10 }))
  })

  it('asks for a sort in the backend vocabulary', async () => {
    const onMetaChange = vi.fn()
    renderWithTheme(
      <SATable<Row> rowKey="id" columns={columns} dataSource={rows} meta={meta} onMetaChange={onMetaChange} />,
    )

    await userEvent.click(screen.getByText('Name'))

    expect(onMetaChange).toHaveBeenCalledWith(
      expect.objectContaining({ orderField: 'name', order: 'ASC' }),
    )
  })
})
