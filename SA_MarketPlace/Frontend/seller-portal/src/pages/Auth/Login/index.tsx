import { Typography } from 'antd'
import styled from 'styled-components'
import AuthError from 'src/pages/Auth/components/AuthError'
import AuthCard from 'src/pages/Auth/components/AuthCard'
import AuthPanel from 'src/pages/Auth/components/AuthPanel'
import LoginForm from 'src/pages/Auth/Login/components/LoginForm'
import { SUPPORT_EMAIL } from 'src/constants'
import { useLoginMutation } from 'src/store/auth/actions'

// Signing in stores the token; PublicRoute then sends the seller on, so the page has nothing to navigate. Where they land
// (the dashboard, or the status of their application) is decided by the pages after it.
const LoginPage = () => {
  const [login, { isLoading, error }] = useLoginMutation()

  return (
    <AuthPanel title="Supplier sign in" subtitle="Access your orders, catalogue and dispatch tools.">
      <AuthCard>
        <AuthError error={error} />
        <LoginForm loading={isLoading} onSubmit={login} />
      </AuthCard>
      <Support type="secondary">
        Trouble signing in? Contact <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
      </Support>
    </AuthPanel>
  )
}

export default LoginPage

const Support = styled(Typography.Paragraph)`
  && {
    margin: ${({ theme }) => theme.marginLG}px 0 0;
    font-size: ${({ theme }) => theme.fontSizeSM}px;
    text-align: center;
  }
`
