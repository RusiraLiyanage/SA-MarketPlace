import { ArrowLeftOutlined, CheckOutlined, MailOutlined } from '@ant-design/icons'
import { Button, Flex, Typography } from 'antd'
import { useState } from 'react'
import { Link } from 'react-router'
import styled from 'styled-components'
import AuthError from 'src/pages/Auth/components/AuthError'
import AuthCard from 'src/pages/Auth/components/AuthCard'
import AuthPanel from 'src/pages/Auth/components/AuthPanel'
import ForgotPasswordForm from 'src/pages/Auth/ForgotPassword/components/ForgotPasswordForm'
import { PATHS } from 'src/router/paths'
import { useForgotPasswordMutation } from 'src/store/auth/actions'
import { SAPageTitle } from 'src/components/SATitle'

// The backend answers the same whether or not the email has an account (ADR 0029), so the confirmation never says
// which: the design's "we've sent a link to <email>" becomes "if an account exists for <email>".
const ForgotPasswordPage = () => {
  const [requestReset, { isLoading, isSuccess, error }] = useForgotPasswordMutation()
  const [email, setEmail] = useState('')
  const send = (values: { email: string }) => {
    setEmail(values.email)
    return requestReset(values)
  }

  return isSuccess ? (
    <Sent>
      <Done aria-hidden>
        <CheckOutlined />
      </Done>
      <SAPageTitle>Check your email</SAPageTitle>
      <Typography.Text type="secondary">If an account exists for</Typography.Text>
      <Typography.Text strong>{email}</Typography.Text>
      <Typography.Text type="secondary">a password reset link is on its way.</Typography.Text>
      <Resend>
        <AuthError error={error} />
        <Typography.Text type="secondary">Didn&apos;t get it? Check your spam folder, or </Typography.Text>
        <Button type="link" size="small" loading={isLoading} onClick={() => requestReset({ email })}>
          resend the reset link
        </Button>
      </Resend>
      <BackToSignIn />
    </Sent>
  ) : (
    <AuthPanel
      icon={<MailOutlined />}
      title="Reset your password"
      subtitle="Enter the email linked to your supplier account and we'll send you a reset link."
    >
      <AuthCard>
        <AuthError error={error} />
        <ForgotPasswordForm loading={isLoading} onSubmit={send} />
      </AuthCard>
      <BackToSignIn />
    </AuthPanel>
  )
}

export default ForgotPasswordPage

const BackToSignIn = () => (
  <Flex justify="center">
    <Back to={PATHS.login}>
      <ArrowLeftOutlined /> Back to sign in
    </Back>
  </Flex>
)

const Back = styled(Link)`
  margin-top: ${({ theme }) => theme.marginLG}px;
`

const Sent = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  max-width: 440px;
  text-align: center;

  h1.ant-typography {
    margin-bottom: ${({ theme }) => theme.marginXS}px;
  }

`

const Resend = styled(AuthCard)`
  width: 100%;
  margin-top: ${({ theme }) => theme.marginLG}px;
  text-align: left;
`

const Done = styled.span`
  display: grid;
  place-items: center;
  width: 56px;
  height: 56px;
  margin-bottom: ${({ theme }) => theme.margin}px;
  background: ${({ theme }) => theme.colorSuccessText};
  border-radius: 50%;
  color: ${({ theme }) => theme.colorBgContainer};
  font-size: 28px;
`
