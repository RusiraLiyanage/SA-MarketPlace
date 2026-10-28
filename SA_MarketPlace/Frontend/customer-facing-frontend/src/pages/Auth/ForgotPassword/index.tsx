import { Button, Result } from 'antd'
import { Link } from 'react-router'
import AuthError from 'src/pages/Auth/components/AuthError'
import AuthPanel from 'src/pages/Auth/components/AuthPanel'
import ForgotPasswordForm from 'src/pages/Auth/ForgotPassword/components/ForgotPasswordForm'
import { PATHS } from 'src/router/paths'
import { useForgotPasswordMutation } from 'src/store/auth/actions'

// The backend answers the same whether or not the email has an account, so the confirmation never says which.
const ForgotPasswordPage = () => {
  const [requestReset, { isLoading, isSuccess, error }] = useForgotPasswordMutation()

  return (
    <AuthPanel
      title="Forgot your password?"
      subtitle="Enter your email address and we will send you a link to reset it."
    >
      {isSuccess ? (
        <Result
          status="success"
          title="Check your email"
          subTitle="If an account exists for that email address, a reset link is on its way."
          extra={
            <Link to={PATHS.login}>
              <Button type="primary">Back to sign in</Button>
            </Link>
          }
        />
      ) : (
        <>
          <AuthError error={error} />
          <ForgotPasswordForm loading={isLoading} onSubmit={requestReset} />
        </>
      )}
    </AuthPanel>
  )
}

export default ForgotPasswordPage
