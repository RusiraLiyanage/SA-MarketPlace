import { Layout } from 'antd'
import { Outlet } from 'react-router'
import styled from 'styled-components'
import AuthHeader from 'src/components/layouts/AuthLayout/AuthHeader'
import SASkipLink, { MAIN_CONTENT_ID } from 'src/components/SASkipLink'

// Sign in, register, password pages and the application status screens: logo header and centred content, no navigation.
const AuthLayout = () => (
  <Shell>
    <SASkipLink />
    <AuthHeader />
    <Content id={MAIN_CONTENT_ID} tabIndex={-1}>
      <Outlet />
    </Content>
  </Shell>
)

export default AuthLayout

const Shell = styled(Layout)`
  min-height: 100vh;
`

const Content = styled(Layout.Content)`
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: ${({ theme }) => theme.paddingXL * 2}px ${({ theme }) => theme.padding}px;
`
