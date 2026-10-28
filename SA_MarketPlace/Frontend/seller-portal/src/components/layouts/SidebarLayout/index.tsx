import { Layout } from 'antd'
import { Outlet } from 'react-router'
import styled from 'styled-components'
import SASidebar from 'src/components/layouts/SidebarLayout/SASidebar'
import SASkipLink, { MAIN_CONTENT_ID } from 'src/components/SASkipLink'
import { useGetOverviewQuery } from 'src/store/dashboard/actions'

// Everything an approved seller sees: the sidebar, then the page. The sidebar's business name and Catalogue badge come
// from the dashboard overview, which every change to an order or a listing refreshes.
const SidebarLayout = () => {
  const { data: overview } = useGetOverviewQuery()

  return (
    <Shell>
      <SASkipLink />
      <SASidebar businessName={overview?.businessName ?? ''} listingsNeedingAttention={overview?.listingsNeedingAttention ?? 0} />
      <Content id={MAIN_CONTENT_ID} tabIndex={-1}>
        <Outlet />
      </Content>
    </Shell>
  )
}

export default SidebarLayout

const Shell = styled(Layout)`
  min-height: 100vh;
`

const Content = styled(Layout.Content)`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.marginLG}px;
  padding: ${({ theme }) => theme.paddingLG}px ${({ theme }) => theme.paddingXL}px;
`
