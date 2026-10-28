import { SearchOutlined } from '@ant-design/icons'
import { Input, Select } from 'antd'
import styled from 'styled-components'
import { FULFILMENT_FILTERS, PAYMENT_FILTERS } from 'src/constants'
import type { FulfilmentFilter, PaymentFilter } from 'src/pages/Orders/ordersQuery'

interface Props {
  search: string
  payment: PaymentFilter
  fulfilment: FulfilmentFilter
  onSearch: (search: string) => void
  onPaymentChange: (payment: PaymentFilter) => void
  onFulfilmentChange: (fulfilment: FulfilmentFilter) => void
}

const OrderFilters = ({ search, payment, fulfilment, onSearch, onPaymentChange, onFulfilmentChange }: Props) => (
  <Filters>
    <Input
      // Re-mounts when the address's search changes (for example "Clear filters"), so the box shows it.
      key={search}
      type="search"
      allowClear
      defaultValue={search}
      prefix={<SearchOutlined />}
      placeholder="Search order # or customer..."
      aria-label="Search orders"
      maxLength={100}
      onPressEnter={(event) => onSearch(event.currentTarget.value.trim())}
      onChange={(event) => {
        // The clear button empties the box; searching again is not needed for that.
        if (event.target.value === '' && search !== '') onSearch('')
      }}
    />
    <Select<PaymentFilter>
      aria-label="Payment status"
      prefix="Payment:"
      value={payment}
      options={PAYMENT_FILTERS.map(({ value, label }) => ({ value, label }))}
      onChange={(value) => onPaymentChange(value)}
    />
    <Select<FulfilmentFilter>
      aria-label="Fulfilment stage"
      prefix="Fulfilment:"
      value={fulfilment}
      options={FULFILMENT_FILTERS.map(({ value, label }) => ({ value, label }))}
      onChange={(value) => onFulfilmentChange(value)}
    />
  </Filters>
)

export default OrderFilters

const Filters = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.margin}px;

  .ant-input-affix-wrapper {
    width: 300px;
  }

  .ant-select {
    min-width: 170px;
  }

  input[type='search']::-webkit-search-cancel-button {
    display: none;
  }
`
