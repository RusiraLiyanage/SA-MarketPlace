import { Button, Typography } from 'antd'
import { Link, useNavigate } from 'react-router'
import styled from 'styled-components'
import SAEmpty from 'src/components/SAEmpty'
import SAStatusTag from 'src/components/SAStatusTag'
import SATable from 'src/components/SATable'
import { PATHS } from 'src/router/paths'
import type { OrderSummary } from 'src/types'
import { formatCurrency, formatDate, pluralise } from 'src/utils/format'

interface Props {
  orders: OrderSummary[]
  /** True while a new filter or page is loading and the rows shown are still the old ones. */
  loading?: boolean
  /** True when a search or status is applied, so an empty table says nothing matched rather than no orders yet. */
  filtered: boolean
  onClearFilters: () => void
}

const OrdersTable = ({ orders, loading, filtered, onClearFilters }: Props) => {
  const navigate = useNavigate()

  return (
    <SATable<OrderSummary>
      rowKey="orderNumber"
      dataSource={orders}
      loading={loading}
      locale={{
        emptyText: filtered ? (
          <SAEmpty
            title="No orders match your search"
            description="Try another order number or status."
            action={<Button onClick={onClearFilters}>Clear filters</Button>}
          />
        ) : (
          <SAEmpty
            title="You haven't placed any orders yet"
            description="Orders you place will appear here."
            action={
              <Button type="primary" onClick={() => navigate(PATHS.shop)}>
                Browse the shop
              </Button>
            }
          />
        ),
      }}
      columns={[
        {
          title: 'ORDER #',
          dataIndex: 'orderNumber',
          render: (orderNumber: string) => <OrderLink to={PATHS.orderDetail(orderNumber)}>{orderNumber}</OrderLink>,
        },
        { title: 'DATE', dataIndex: 'placedAt', render: (placedAt: string) => formatDate(placedAt) },
        { title: 'ITEMS', dataIndex: 'items', render: (items: OrderSummary['items']) => pluralise(items.length, 'item') },
        { title: 'SUPPLIER', dataIndex: 'supplierName' },
        {
          title: 'TOTAL',
          dataIndex: 'total',
          render: (total: string) => <Typography.Text strong>{formatCurrency(total)}</Typography.Text>,
        },
        { title: 'STATUS', dataIndex: 'status', render: (status: OrderSummary['status']) => <SAStatusTag status={status} /> },
        {
          title: 'ACTIONS',
          render: (_, { orderNumber }) => (
            <Actions>
              <Link to={PATHS.orderDetail(orderNumber)} aria-label={`View details for ${orderNumber}`}>
                View details
              </Link>
              <Button
                type="link"
                size="small"
                aria-label={`Reorder ${orderNumber}`}
                onClick={() => navigate(PATHS.reorderFromOrders(orderNumber))}
              >
                Reorder
              </Button>
            </Actions>
          ),
        },
      ]}
    />
  )
}

export default OrdersTable

const OrderLink = styled(Link)`
  font-weight: 600;
`

const Actions = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.marginLG}px;

  .ant-btn-link {
    padding-inline: 0;
  }
`
