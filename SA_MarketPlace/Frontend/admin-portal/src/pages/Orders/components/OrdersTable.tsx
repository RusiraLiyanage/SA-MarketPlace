import { Button } from 'antd'
import { Link } from 'react-router'
import SAEmpty from 'src/components/SAEmpty'
import SATable from 'src/components/SATable'
import SAToneTag from 'src/components/SAToneTag'
import { PATHS } from 'src/router/paths'
import { FULFILMENT_DISPLAY, paymentDisplay } from 'src/store/orders/selector'
import type { AdminOrderListItem, FulfilmentStage, OrderPayment, OrderSortField } from 'src/store/orders/types'
import { formatCurrency, formatDate } from 'src/utils/format'

interface Props {
  orders: AdminOrderListItem[]
  loading?: boolean
  /** The column the table is sorted by now, so its arrow shows. */
  sortField: OrderSortField
  sortOrder: 'ASC' | 'DESC'
  /** Called with the column pressed, or nothing when the sort was switched off. */
  onSortChange: (sort: { orderField?: OrderSortField; order?: 'ASC' | 'DESC' }) => void
  /** A search or a filter is applied, so an empty table means "nothing matches" rather than "no orders yet". */
  filtered?: boolean
  onClearFilters: () => void
}

// The table's column keys are the response's field names; the backend sorts by its own (snake case) names.
const BACKEND_FIELD: Record<string, OrderSortField> = { orderNumber: 'order_number', placedAt: 'placed_at', total: 'total' }

// An order number, a date and an amount are each one thing to read, so they are not broken across lines.
const oneLine = () => ({ style: { whiteSpace: 'nowrap' as const } })

const sortOrderFor = (column: OrderSortField, field: OrderSortField, order: 'ASC' | 'DESC') =>
  column === field ? (order === 'ASC' ? ('ascend' as const) : ('descend' as const)) : null

const OrdersTable = ({ orders, loading, sortField, sortOrder, onSortChange, filtered, onClearFilters }: Props) => (
  <SATable<AdminOrderListItem>
    rowKey="orderNumber"
    dataSource={orders}
    loading={loading}
    onMetaChange={({ orderField, order }) => {
      const field = typeof orderField === 'string' ? BACKEND_FIELD[orderField] : undefined
      onSortChange(field && order ? { orderField: field, order } : {})
    }}
    locale={{
      emptyText: filtered ? (
        <SAEmpty
          title="No orders match"
          description="Try a different order number, customer or filter."
          action={<Button onClick={onClearFilters}>Clear filters</Button>}
        />
      ) : (
        <SAEmpty title="No orders yet" description="Every marketplace and Collection Manager order will appear here with its payment and fulfilment status." />
      ),
    }}
    columns={[
      {
        title: 'ORDER #',
        dataIndex: 'orderNumber',
        sorter: true,
        sortOrder: sortOrderFor('order_number', sortField, sortOrder),
        onCell: oneLine,
        render: (orderNumber: string) => <Link to={PATHS.orderDetail(orderNumber)}>{orderNumber}</Link>,
      },
      { title: 'CUSTOMER', dataIndex: 'customerName' },
      { title: 'SUPPLIER', dataIndex: 'supplierName' },
      {
        title: 'DATE',
        dataIndex: 'placedAt',
        sorter: true,
        sortOrder: sortOrderFor('placed_at', sortField, sortOrder),
        onCell: oneLine,
        render: (placedAt: string) => formatDate(placedAt),
      },
      {
        title: 'VALUE',
        dataIndex: 'total',
        sorter: true,
        sortOrder: sortOrderFor('total', sortField, sortOrder),
        onCell: oneLine,
        render: (total: string) => <strong>{formatCurrency(total)}</strong>,
      },
      {
        title: 'PAYMENT',
        dataIndex: 'payment',
        render: (payment: OrderPayment | null) => {
          const { label, tone } = paymentDisplay(payment)
          return <SAToneTag tone={tone}>{label}</SAToneTag>
        },
      },
      {
        title: 'FULFILMENT',
        dataIndex: 'fulfilment',
        render: (fulfilment: FulfilmentStage) => {
          const { label, tone } = FULFILMENT_DISPLAY[fulfilment]
          return <SAToneTag tone={tone}>{label}</SAToneTag>
        },
      },
      {
        title: <span className="sr-only">Action</span>,
        key: 'action',
        render: (_, { orderNumber }) => (
          <Link to={PATHS.orderDetail(orderNumber)} aria-label={`View ${orderNumber}`}>
            View
          </Link>
        ),
      },
    ]}
  />
)

export default OrdersTable

