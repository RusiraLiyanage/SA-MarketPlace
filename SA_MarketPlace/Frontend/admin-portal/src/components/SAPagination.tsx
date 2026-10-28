import { Pagination, Select } from 'antd'
import styled from 'styled-components'
import { PAGE_SIZE_OPTIONS } from 'src/constants'
import type { PagingMeta } from 'src/infra/pagination'

interface Props {
  meta: PagingMeta
  /** Changing the page size goes back to page 1. The page is scrolled back to the top first, so the new results start in view. */
  onChange: (page: number, limit: number) => void
}

// "1 of 3" on the left, the pager in the middle, the page size on the right.
const SAPagination = ({ meta, onChange }: Props) => {
  const change = (page: number, limit: number) => {
    window.scrollTo({ top: 0 })
    onChange(page, limit)
  }

  return (
    <Container>
      <Summary>
        {meta.page} of {Math.max(meta.totalPage, 1)}
      </Summary>
      <Pagination
        current={meta.page}
        pageSize={meta.limit}
        total={meta.totalItem}
        showSizeChanger={false}
        onChange={(page) => change(page, meta.limit)}
      />
      <PageSize
        aria-label="Page size"
        value={meta.limit}
        options={PAGE_SIZE_OPTIONS.map((size) => ({ value: size, label: `${size} / page` }))}
        onChange={(limit) => change(1, limit)}
      />
    </Container>
  )
}

export default SAPagination

const Container = styled.div`
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
`

const Summary = styled.span`
  color: ${({ theme }) => theme.colorTextSecondary};
`

const PageSize = styled(Select<number>)`
  justify-self: end;
  min-width: 112px;
`
