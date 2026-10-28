import AuthCard from 'src/pages/Auth/components/AuthCard'
import AuthError from 'src/pages/Auth/components/AuthError'
import AuthPanel from 'src/pages/Auth/components/AuthPanel'
import RegisterForm from 'src/pages/Auth/Register/components/RegisterForm'
import { useRegisterMutation } from 'src/store/auth/actions'

// The new admin is signed in straight away, so as with sign-in PublicRoute does the redirect. An address outside the allowed
// Sample Assist domains is refused with the backend's own message (ADR 0038), shown above the form.
const RegisterPage = () => {
  const [register, { isLoading, error }] = useRegisterMutation()

  return (
    <AuthPanel title="Register admin account" subtitle="Use your Sample Assist work email address to create an admin account.">
      <AuthCard>
        <AuthError error={error} />
        <RegisterForm
          loading={isLoading}
          // Only the fields the backend knows: it rejects the rest, including the confirm box that is checked here.
          onSubmit={({ fullName, email, password }) => register({ fullName: fullName.trim(), email, password, acceptTerms: true })}
        />
      </AuthCard>
    </AuthPanel>
  )
}

export default RegisterPage
