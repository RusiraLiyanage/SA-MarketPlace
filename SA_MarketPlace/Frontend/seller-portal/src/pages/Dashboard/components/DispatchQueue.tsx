import { Button, Typography } from 'antd'
import { Link, useNavigate } from 'react-router'
import styled from 'styled-components'
import SAEmpty from 'src/components/SAEmpty'
import SALoadError from 'src/components/SALoadError'
import SAPagination from 'src/components/SAPagination'
import SATable from 'src/components/SATable'
import { SASectionTitle } from 'src/components/SATitle'
import SlaTag from 'src/pages/Dashboard/components/SlaTag'
import { PATHS } from 'src/router/paths'
import type { PaginatedData } from 'src/infra/pagination'
import type { DispatchQueueRow } from 'src/store/dashboard/types'
import { formatDate, pluralise } from 'src/utils/format'

interface Props {
  queue?: PaginatedData<DispatchQueueRow>
  loading?: boolean
  /** Why the queue could not be loaded; shown instead of an empty table, which would read as "nothing to do". */
  error?: unknown
  onRetry?: () => void
  onPageChange: (page: number, limit: number) => void
}

// Past this many rows the list scrolls inside the card, under a fixed header, instead of stretching the page.
const SCROLL_AFTER_ROWS = 6
const SCROLL_HEIGHT = 400

// "Orders requiring dispatch": the orders to act on, the one closest to its deadline first.
const DispatchQueue = ({ queue, loading, error, onRetry, onPageChange }: Props) => {
  const navigate = useNavigate()
  const rows = queue?.data ?? []

  return (
    <Card aria-label="Orders requiring dispatch">
      <SASectionTitle>Orders requiring dispatch</SASectionTitle>
      {error && !queue ? (
        <SALoadError what="the orders to dispatch" error={error} onRetry={() => onRetry?.()} />
      ) : (
        <SATable<DispatchQueueRow>
          rowKey="orderNumber"
          dataSource={rows}
          loading={loading}
          showHeader={rows.length > 0}
          scroll={rows.length > SCROLL_AFTER_ROWS ? { y: SCROLL_HEIGHT } : undefined}
          locale={{ emptyText: <SAEmpty title="No orders to dispatch right now" /> }}
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
            { title: 'SLA', dataIndex: 'slaHoursLeft', render: (hoursLeft: number) => <SlaTag hoursLeft={hoursLeft} /> },
            {
              title: <span className="sr-only">Action</span>,
              key: 'action',
              align: 'right',
              render: (_, { orderNumber }) => (
                <Button type="primary" size="small" onClick={() => navigate(PATHS.orderDetail(orderNumber))} aria-label={`Dispatch ${orderNumber}`}>
                  Dispatch
                </Button>
              ),
            },
          ]}
        />
      )}
      {queue && queue.pagingMeta.totalPage > 1 && <SAPagination meta={queue.pagingMeta} onChange={onPageChange} />}
    </Card>
  )
}

export default DispatchQueue

const Card = styled.section`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.margin}px;
  padding: ${({ theme }) => theme.padding}px ${({ theme }) => theme.paddingLG}px;
  background: ${({ theme }) => theme.colorBgContainer};
  border-radius: ${({ theme }) => theme.borderRadiusLG}px;
`
