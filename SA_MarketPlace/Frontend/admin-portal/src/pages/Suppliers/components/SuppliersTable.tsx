import { Button, Typography } from 'antd'
import { useNavigate } from 'react-router'
import styled from 'styled-components'
import SAEmpty from 'src/components/SAEmpty'
import SATable from 'src/components/SATable'
import SAToneTag from 'src/components/SAToneTag'
import type { SupplierFilter } from 'src/pages/Suppliers/suppliersQuery'
import { PATHS } from 'src/router/paths'
import { SUPPLIER_STATUS_DISPLAY, waitingLabel } from 'src/store/suppliers/selector'
import { SupplierStatus, type SupplierApplicationListItem } from 'src/store/suppliers/types'
import { formatAbn } from 'src/utils/abn'
import { formatDate } from 'src/utils/format'

interface Props {
  suppliers: SupplierApplicationListItem[]
  loading?: boolean
  /** Which chip is chosen, and whether a search is typed: together they say why the table is empty. */
  status: SupplierFilter
  searching?: boolean
  onClearFilters: () => void
  onViewApproved: () => void
}

const SuppliersTable = ({ suppliers, loading, status, searching, onClearFilters, onViewApproved }: Props) => {
  const navigate = useNavigate()

  return (
    <SATable<SupplierApplicationListItem>
      rowKey="id"
      dataSource={suppliers}
      loading={loading}
      locale={{
        emptyText:
          status === 'pending_review' && !searching ? (
            <SAEmpty
              title="No applications awaiting review"
              description="New supplier registrations will appear here for approval. Nothing needs your attention right now."
              action={<Button onClick={onViewApproved}>View approved suppliers</Button>}
            />
          ) : status !== 'all' || searching ? (
            <SAEmpty
              title="No suppliers match"
              description="Try a different business name, ABN or status."
              action={<Button onClick={onClearFilters}>Clear filters</Button>}
            />
          ) : (
            <SAEmpty title="No suppliers yet" description="Suppliers who register will appear here." />
          ),
      }}
      columns={[
        { title: 'BUSINESS NAME', dataIndex: 'businessName', render: (name: string) => <strong>{name}</strong> },
        { title: 'ABN', dataIndex: 'abn', render: (abn: string) => <Abn>{formatAbn(abn)}</Abn> },
        {
          title: 'CONTACT',
          key: 'contact',
          render: (_, { contactName, contactEmail }) => (
            <div>
              <div>{contactName}</div>
              <Typography.Text type="secondary">{contactEmail}</Typography.Text>
            </div>
          ),
        },
        {
          title: 'SUBMITTED',
          dataIndex: 'submittedAt',
          render: (submittedAt: string, { status }) => (
            <div>
              <div>{formatDate(submittedAt)}</div>
              {status === SupplierStatus.pendingReview && <Waiting>{waitingLabel(submittedAt)}</Waiting>}
            </div>
          ),
        },
        {
          title: 'STATUS',
          dataIndex: 'status',
          render: (status: SupplierStatus, { reviewedAt, rejectionReason }) => {
            const { label, tone } = SUPPLIER_STATUS_DISPLAY[status]
            return (
              <div>
                <SAToneTag tone={tone}>{label}</SAToneTag>
                {status === SupplierStatus.approved && reviewedAt && (
                  <Detail type="secondary">Reviewed {formatDate(reviewedAt)}</Detail>
                )}
                {status === SupplierStatus.rejected && rejectionReason && <Detail type="secondary">{rejectionReason}</Detail>}
              </div>
            )
          },
        },
        {
          title: 'ACTION',
          key: 'action',
          render: (_, { id, businessName, status }) =>
            status === SupplierStatus.pendingReview ? (
              <Button type="primary" size="small" onClick={() => navigate(PATHS.supplierApplication(id))} aria-label={`Review ${businessName}`}>
                Review
              </Button>
            ) : (
              <Button size="small" onClick={() => navigate(PATHS.supplierApplication(id))} aria-label={`View ${businessName}`}>
                View
              </Button>
            ),
        },
      ]}
    />
  )
}

export default SuppliersTable

// An ABN is one thing to read, so it is not broken across two lines.
const Abn = styled.span`
  white-space: nowrap;
`

// Amber text for a wait, in the darker warning step so it passes the contrast minimum.
const Waiting = styled(Typography.Text)`
  && {
    color: ${({ theme }) => theme.colorWarningText};
    font-size: ${({ theme }) => theme.fontSizeSM}px;
  }
`

const Detail = styled(Typography.Text)`
  display: block;
  margin-top: ${({ theme }) => theme.marginXXS}px;
  font-size: ${({ theme }) => theme.fontSizeSM}px;
`
