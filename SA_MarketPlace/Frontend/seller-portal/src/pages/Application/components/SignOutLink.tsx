import { Button } from 'antd'
import { useLogoutMutation } from 'src/store/auth/actions'

// A seller who is not approved has no business profile to sign out from, so the status screens offer it themselves.
const SignOutLink = () => {
  const [logout, { isLoading }] = useLogoutMutation()

  return (
    <Button type="link" loading={isLoading} onClick={() => logout()}>
      Sign out
    </Button>
  )
}

export default SignOutLink
