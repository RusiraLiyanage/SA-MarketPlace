import { BookOutlined, CarOutlined, ShoppingOutlined } from '@ant-design/icons'
import { useState } from 'react'
import styled from 'styled-components'
import SALoadError from 'src/components/SALoadError'
import SAPageHeader from 'src/components/SAPageHeader'
import SASkeleton from 'src/components/SASkeleton'
import DispatchQueue from 'src/pages/Dashboard/components/DispatchQueue'
import StatCard from 'src/pages/Dashboard/components/StatCard'
import WelcomeBanner from 'src/pages/Dashboard/components/WelcomeBanner'
import { useGetDispatchQueueQuery, useGetOverviewQuery } from 'src/store/dashboard/actions'
import { isNewSeller } from 'src/store/dashboard/selector'
import { pluralise } from 'src/utils/format'

const DEFAULT_PAGE_SIZE = 10

// The first screen after sign-in: three numbers, then the orders waiting to go out.
const DashboardPage = () => {
  const { data: overview, error, isLoading, refetch } = useGetOverviewQuery()
  const [paging, setPaging] = useState({ page: 1, limit: DEFAULT_PAGE_SIZE })
  // `data` keeps the previous page while the next one loads, so the table does not empty out in between.
  const { data: queue, error: queueError, isFetching: loadingQueue, refetch: refetchQueue } = useGetDispatchQueueQuery(paging)

  if (isLoading) {
    return (
      <>
        <SAPageHeader title="Supplier overview" />
        <SASkeleton rows={6} />
      </>
    )
  }

  if (!overview) {
    return (
      <>
        <SAPageHeader title="Supplier overview" />
        <SALoadError what="your dashboard" error={error} onRetry={refetch} />
      </>
    )
  }

  const fresh = isNewSeller(overview)

  return (
    <>
      <SAPageHeader title="Supplier overview" />
      {fresh && <WelcomeBanner businessName={overview.businessName} />}
      <Cards>
        <StatCard
          tone="primary"
          icon={<ShoppingOutlined />}
          label="New orders"
          value={overview.newOrders}
          unit={overview.newOrders === 1 ? 'order' : 'orders'}
          note={fresh ? 'Nothing yet' : 'Requiring action'}
          muted={fresh}
        />
        <StatCard
          tone="success"
          icon={<CarOutlined />}
          label="Dispatched today"
          value={overview.dispatchedToday}
          unit={overview.dispatchedToday === 1 ? 'order' : 'orders'}
          note={fresh ? 'Nothing yet' : 'Since midnight, your time'}
          muted={fresh}
        />
        <StatCard
          tone="info"
          icon={<BookOutlined />}
          label="Active listings"
          value={overview.activeListings}
          unit={overview.activeListings === 1 ? 'product' : 'products'}
          note={
            fresh
              ? 'Add your first product'
              : overview.listingsNeedingAttention > 0
                ? `${pluralise(overview.listingsNeedingAttention, 'product')} need${overview.listingsNeedingAttention === 1 ? 's' : ''} attention`
                : 'None need attention'
          }
          muted={fresh}
        />
      </Cards>
      <DispatchQueue queue={queue} loading={loadingQueue} error={queueError} onRetry={refetchQueue} onPageChange={(page, limit) => setPaging({ page, limit })} />
    </>
  )
}

export default DashboardPage

const Cards = styled.div`
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: ${({ theme }) => theme.margin}px;
`
