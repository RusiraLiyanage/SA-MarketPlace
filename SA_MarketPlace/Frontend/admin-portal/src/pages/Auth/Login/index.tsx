import { Typography } from 'antd'
import styled from 'styled-components'
import AuthCard from 'src/pages/Auth/components/AuthCard'
import AuthError from 'src/pages/Auth/components/AuthError'
import AuthPanel from 'src/pages/Auth/components/AuthPanel'
import LoginForm from 'src/pages/Auth/Login/components/LoginForm'
import { useLoginMutation } from 'src/store/auth/actions'

// Signing in stores the token; PublicRoute then sends the admin on (back to where they were headed, or to the supplier queue),
// so the page has nothing to navigate. The backend lets only admins in: a seller or buyer gets a refusal, shown here.
const LoginPage = () => {
  const [login, { isLoading, error }] = useLoginMutation()

  return (
    <AuthPanel title="Admin sign in" subtitle="Supplier verification and order oversight for Sample Assist staff.">
      <AuthCard>
        <AuthError error={error} />
        <LoginForm loading={isLoading} onSubmit={login} />
      </AuthCard>
      <Footnote type="secondary">Admin accounts are only available to Sample Assist staff email addresses.</Footnote>
    </AuthPanel>
  )
}

export default LoginPage

const Footnote = styled(Typography.Paragraph)`
  && {
    margin: ${({ theme }) => theme.marginLG}px 0 0;
    font-size: ${({ theme }) => theme.fontSizeSM}px;
    text-align: center;
  }
`
