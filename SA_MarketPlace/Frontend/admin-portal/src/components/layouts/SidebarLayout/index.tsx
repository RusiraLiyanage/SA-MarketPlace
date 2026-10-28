import { Layout } from 'antd'
import { Outlet } from 'react-router'
import styled from 'styled-components'
import SASidebar from 'src/components/layouts/SidebarLayout/SASidebar'
import SASkipLink, { MAIN_CONTENT_ID } from 'src/components/SASkipLink'
import { useGetSupplierSummaryQuery } from 'src/store/suppliers/actions'

// Everything a signed-in admin sees: the sidebar, then the page. The Suppliers badge is the number of applications awaiting
// review, which every decision refreshes.
const SidebarLayout = () => {
  const { data: summary } = useGetSupplierSummaryQuery()

  return (
    <Shell>
      <SASkipLink />
      <SASidebar pendingApplications={summary?.pendingReview ?? 0} />
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
