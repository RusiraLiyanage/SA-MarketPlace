import { Button, Result } from 'antd'
import { Link, useSearchParams } from 'react-router'
import AuthError from 'src/pages/Auth/components/AuthError'
import AuthPanel from 'src/pages/Auth/components/AuthPanel'
import ResetPasswordForm from 'src/pages/Auth/ResetPassword/components/ResetPasswordForm'
import { PATHS } from 'src/router/paths'
import { useResetPasswordMutation } from 'src/store/auth/actions'

// The reset link carries ?token=. Without one there is nothing to reset, and the backend gives the same
// message for a missing, used or expired link.
const ResetPasswordPage = () => {
  const [params] = useSearchParams()
  const [resetPassword, { isLoading, isSuccess, error }] = useResetPasswordMutation()
  const token = params.get('token')

  if (!token) {
    return (
      <AuthPanel title="Reset your password">
        <Result
          status="warning"
          title="This reset link is invalid or has expired"
          extra={
            <Link to={PATHS.forgotPassword}>
              <Button type="primary">Request a new link</Button>
            </Link>
          }
        />
      </AuthPanel>
    )
  }

  return (
    <AuthPanel title="Reset your password" subtitle="Choose a new password for your account.">
      {isSuccess ? (
        <Result
          status="success"
          title="Password updated"
          subTitle="You can now sign in with your new password."
          extra={
            <Link to={PATHS.login}>
              <Button type="primary">Sign in</Button>
            </Link>
          }
        />
      ) : (
        <>
          <AuthError error={error} />
          <ResetPasswordForm loading={isLoading} onSubmit={({ password }) => resetPassword({ token, password })} />
        </>
      )}
    </AuthPanel>
  )
}

export default ResetPasswordPage
