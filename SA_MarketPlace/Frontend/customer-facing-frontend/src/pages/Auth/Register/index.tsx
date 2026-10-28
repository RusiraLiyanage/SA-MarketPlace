import AuthError from 'src/pages/Auth/components/AuthError'
import AuthPanel from 'src/pages/Auth/components/AuthPanel'
import RegisterForm from 'src/pages/Auth/Register/components/RegisterForm'
import { useRegisterMutation } from 'src/store/auth/actions'

// The new account is signed in straight away, so as with sign-in PublicRoute does the redirect.
const RegisterPage = () => {
  const [register, { isLoading, error }] = useRegisterMutation()

  return (
    <AuthPanel
      wide
      title="Create your account"
      subtitle="One account works across the marketplace and Collection Manager."
    >
      <AuthError error={error} />
      <RegisterForm
        loading={isLoading}
        // Only the fields the backend knows: it rejects the rest, including the confirm box that is checked here.
        onSubmit={({ email, password, firstName, lastName, organisation }) =>
          register({ email, password, firstName, lastName, organisation, acceptTerms: true })
        }
      />
    </AuthPanel>
  )
}

export default RegisterPage
