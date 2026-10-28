import { Alert, Typography } from 'antd'
import SALoadError from 'src/components/SALoadError'
import SAPageHeader from 'src/components/SAPageHeader'
import SAPagination from 'src/components/SAPagination'
import SASkeleton from 'src/components/SASkeleton'
import SupplierFilters from 'src/pages/Suppliers/components/SupplierFilters'
import SuppliersTable from 'src/pages/Suppliers/components/SuppliersTable'
import { toSuppliersRequest } from 'src/pages/Suppliers/suppliersQuery'
import { useSuppliersQuery } from 'src/pages/Suppliers/useSuppliersQuery'
import { awaitingBanner } from 'src/store/suppliers/selector'
import { useGetSupplierSummaryQuery, useListSuppliersQuery } from 'src/store/suppliers/actions'

// The queue an admin works through: pending applications first, oldest first. The numbers on the chips and in the banner come
// from the summary, which a decision on an application refreshes.
const SuppliersPage = () => {
  const { query, update, clear } = useSuppliersQuery()
  // `data` keeps the previous results while a new filter loads, so the table dims instead of flashing empty.
  const { data: suppliers, error, isLoading, isFetching, refetch } = useListSuppliersQuery(toSuppliersRequest(query))
  const { data: summary } = useGetSupplierSummaryQuery()
  const banner = summary ? awaitingBanner(summary.pendingReview) : null

  return (
    <>
      <SAPageHeader title="Supplier verification" />
      {banner && <Alert showIcon type="warning" title={banner} />}
      <SupplierFilters
        search={query.search}
        status={query.status}
        counts={summary}
        onSearch={(search) => update({ search })}
        onStatusChange={(status) => update({ status })}
      />
      {isLoading ? (
        <SASkeleton rows={6} />
      ) : !suppliers ? (
        <SALoadError what="the supplier applications" error={error} onRetry={refetch} />
      ) : (
        <>
          <SuppliersTable
            suppliers={suppliers.data}
            loading={isFetching}
            status={query.status}
            searching={query.search !== ''}
            onClearFilters={clear}
            onViewApproved={() => update({ status: 'approved', search: '' })}
          />
          {suppliers.pagingMeta.totalItem > 0 && (
            <SAPagination meta={suppliers.pagingMeta} onChange={(page, limit) => update({ page, limit })} />
          )}
          <Typography.Text type="secondary">
            Open an application to approve or reject it. The applicant is told the outcome by email, and a rejection reason is shown to them.
          </Typography.Text>
        </>
      )}
    </>
  )
}

export default SuppliersPage
