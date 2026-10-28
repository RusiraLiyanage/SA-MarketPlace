import { SearchOutlined } from '@ant-design/icons'
import { Input } from 'antd'
import styled from 'styled-components'
import SAChipGroup from 'src/components/SAChipGroup'
import { ORDER_STATUS_FILTERS } from 'src/constants'
import type { OrderStatusFilter } from 'src/pages/Orders/ordersQuery'

interface Props {
  search: string
  status: OrderStatusFilter
  onSearch: (search: string) => void
  onStatusChange: (status: OrderStatusFilter) => void
}

const OrderFilters = ({ search, status, onSearch, onStatusChange }: Props) => (
  <Filters>
    <Input
      // Re-mounts when the URL's search changes (for example "Clear filters"), so the box shows it.
      key={search}
      type="search"
      allowClear
      defaultValue={search}
      prefix={<SearchOutlined />}
      placeholder="Search by order number..."
      aria-label="Search orders"
      onPressEnter={(event) => onSearch(event.currentTarget.value.trim())}
      onChange={(event) => {
        // The clear button empties the box; searching again is not needed for that.
        if (event.target.value === '' && search !== '') onSearch('')
      }}
    />
    <SAChipGroup label="Order status" options={ORDER_STATUS_FILTERS} value={status} onChange={onStatusChange} />
  </Filters>
)

export default OrderFilters

const Filters = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.margin}px;

  .ant-input-affix-wrapper {
    width: 320px;
  }

  input[type='search']::-webkit-search-cancel-button {
    display: none;
  }
`
