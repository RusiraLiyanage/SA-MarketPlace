import AuthError from 'src/pages/Auth/components/AuthError'
import AuthCard from 'src/pages/Auth/components/AuthCard'
import AuthPanel from 'src/pages/Auth/components/AuthPanel'
import RegisterForm from 'src/pages/Auth/Register/components/RegisterForm'
import { useRegisterMutation } from 'src/store/auth/actions'
import { abnDigits } from 'src/utils/abn'

// The new seller is signed in straight away (as `pending_review`), so as with sign-in PublicRoute does the redirect.
const RegisterPage = () => {
  const [register, { isLoading, error }] = useRegisterMutation()

  return (
    <AuthPanel
      wide
      title="Register as a marketplace supplier"
      subtitle="Submit your business details below. An administrator will review and approve your account before your listings go live."
    >
      <AuthCard>
        <AuthError error={error} />
        <RegisterForm
          loading={isLoading}
          // Only the fields the backend knows: it rejects the rest, including the confirm box that is checked here.
          onSubmit={({ businessName, abn, businessType, contactName, phone, email, password }) =>
            register({
              businessName: businessName.trim(),
              abn: abnDigits(abn),
              businessType: businessType?.trim() || undefined,
              contactName: contactName.trim(),
              phone: phone.trim(),
              email,
              password,
              confirmAuthorised: true,
            })
          }
        />
      </AuthCard>
    </AuthPanel>
  )
}

export default RegisterPage
