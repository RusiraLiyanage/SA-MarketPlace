import { SearchOutlined } from '@ant-design/icons'
import { Input } from 'antd'
import styled from 'styled-components'
import SAChipGroup from 'src/components/SAChipGroup'
import { SUPPLIER_STATUS_FILTERS } from 'src/constants'
import type { SupplierFilter } from 'src/pages/Suppliers/suppliersQuery'
import type { SupplierApplicationCounts } from 'src/store/suppliers/types'

interface Props {
  search: string
  status: SupplierFilter
  /** Left out until the counts have loaded; the chips then show no numbers. */
  counts?: SupplierApplicationCounts
  onSearch: (search: string) => void
  onStatusChange: (status: SupplierFilter) => void
}

const COUNT_OF = { all: 'all', pending_review: 'pendingReview', approved: 'approved', rejected: 'rejected' } as const

const SupplierFilters = ({ search, status, counts, onSearch, onStatusChange }: Props) => (
  <Filters>
    <Input
      // Re-mounts when the address's search changes (for example "Clear filters"), so the box shows it.
      key={search}
      type="search"
      allowClear
      defaultValue={search}
      prefix={<SearchOutlined />}
      placeholder="Search by business name or ABN..."
      aria-label="Search suppliers"
      maxLength={100}
      onPressEnter={(event) => onSearch(event.currentTarget.value.trim())}
      onChange={(event) => {
        // The clear button empties the box; searching again is not needed for that.
        if (event.target.value === '' && search !== '') onSearch('')
      }}
    />
    <SAChipGroup
      label="Application status"
      options={SUPPLIER_STATUS_FILTERS.map(({ value, label }) => ({ value, label, count: counts?.[COUNT_OF[value]] }))}
      value={status}
      onChange={onStatusChange}
    />
  </Filters>
)

export default SupplierFilters

const Filters = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.margin}px;

  .ant-input-affix-wrapper {
    width: 300px;
  }

  input[type='search']::-webkit-search-cancel-button {
    display: none;
  }
`
