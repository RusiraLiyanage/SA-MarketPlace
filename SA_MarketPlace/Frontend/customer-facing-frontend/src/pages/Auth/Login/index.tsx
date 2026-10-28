import AuthPanel from 'src/pages/Auth/components/AuthPanel'
import AuthError from 'src/pages/Auth/components/AuthError'
import LoginForm from 'src/pages/Auth/Login/components/LoginForm'
import { useLoginMutation } from 'src/store/auth/actions'

// Signing in stores the token; PublicRoute then sends the buyer on, so the page has nothing to navigate.
const LoginPage = () => {
  const [login, { isLoading, error }] = useLoginMutation()

  return (
    <AuthPanel title="Sign in" subtitle="Order workplace testing supplies from verified suppliers.">
      <AuthError error={error} />
      <LoginForm loading={isLoading} onSubmit={login} />
    </AuthPanel>
  )
}

export default LoginPage
