import { Layout } from 'antd'
import { Outlet } from 'react-router'
import styled from 'styled-components'
import Header from 'src/components/layouts/Header'
import SABreadcrumb from 'src/components/SABreadcrumb'
import SASkipLink, { MAIN_CONTENT_ID } from 'src/components/SASkipLink'

// Everything after sign-in: header, breadcrumb, then the page.
const MainLayout = () => (
  <Shell>
    <SASkipLink />
    <Header />
    <SABreadcrumb />
    <Layout.Content id={MAIN_CONTENT_ID} tabIndex={-1}>
      <Outlet />
    </Layout.Content>
  </Shell>
)

export default MainLayout

const Shell = styled(Layout)`
  min-height: 100vh;
`
