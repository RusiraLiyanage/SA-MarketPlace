import { Button, Typography } from 'antd'
import { Link, useNavigate } from 'react-router'
import DownloadInvoiceButton from 'src/components/DownloadInvoiceButton'
import RowActions from 'src/components/RowActions'
import SAEmpty from 'src/components/SAEmpty'
import SAOrderStatusTag from 'src/components/SAOrderStatusTag'
import SATable from 'src/components/SATable'
import { PATHS } from 'src/router/paths'
import type { OrderListItem } from 'src/store/orders/types'
import { formatCurrency, formatDate, pluralise } from 'src/utils/format'

interface Props {
  orders: OrderListItem[]
  loading?: boolean
  /** A search or a status is applied, so an empty table means "nothing matches" rather than "no orders yet". */
  filtered?: boolean
  onClearFilters: () => void
}

const OrdersTable = ({ orders, loading, filtered, onClearFilters }: Props) => {
  const navigate = useNavigate()

  return (
    <SATable<OrderListItem>
      rowKey="orderNumber"
      dataSource={orders}
      loading={loading}
      locale={{
        emptyText: filtered ? (
          <SAEmpty
            title="No orders match"
            description="Try a different order number or status."
            action={<Button onClick={onClearFilters}>Clear filters</Button>}
          />
        ) : (
          <SAEmpty
            title="No orders yet"
            description="Orders placed against your listings will show up here as soon as a buyer checks out."
            action={<Button onClick={() => navigate(PATHS.catalogue)}>View my listings</Button>}
          />
        ),
      }}
      columns={[
        {
          title: 'ORDER #',
          dataIndex: 'orderNumber',
          render: (orderNumber: string) => <Link to={PATHS.orderDetail(orderNumber)}>{orderNumber}</Link>,
        },
        {
          title: 'ORGANISATION',
          dataIndex: 'organisationName',
          render: (name: string | null) => name ?? <Typography.Text type="secondary">No organisation</Typography.Text>,
        },
        { title: 'RECEIVED', dataIndex: 'placedAt', render: (placedAt: string) => formatDate(placedAt) },
        { title: 'ITEMS', dataIndex: 'itemCount', render: (count: number) => pluralise(count, 'item') },
        { title: 'TOTAL', dataIndex: 'total', render: (total: string) => <strong>{formatCurrency(total)}</strong> },
        { title: 'STATUS', dataIndex: 'status', render: (status: OrderListItem['status']) => <SAOrderStatusTag status={status} /> },
        {
          title: 'ACTIONS',
          key: 'actions',
          render: (_, { orderNumber, canDownloadInvoice }) => (
            <RowActions>
              <Link to={PATHS.orderDetail(orderNumber)} aria-label={`View details of ${orderNumber}`}>
                View details
              </Link>
              <DownloadInvoiceButton orderNumber={orderNumber} available={canDownloadInvoice} />
            </RowActions>
          ),
        },
      ]}
    />
  )
}

export default OrdersTable
