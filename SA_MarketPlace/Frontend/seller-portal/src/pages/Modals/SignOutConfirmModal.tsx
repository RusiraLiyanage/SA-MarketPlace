import { useRouteModal } from 'src/hooks/useRouteModal'
import SADialog, { SADialogPoints, SADialogSection } from 'src/components/SADialog'
import { useLogoutMutation } from 'src/store/auth/actions'

// Opens over the business profile (its Sign out button links here). Signing out ends the account's tokens on every
// device (backend ADR 0018); once the session is gone PrivateRoute takes the seller to sign in.
const SignOutConfirmModal = () => {
  const { close } = useRouteModal()
  const [logout, { isLoading }] = useLogoutMutation()

  return (
    <SADialog
      tone="info"
      title="Sign out?"
      summary="You will need your email and password to come back."
      onCancel={close}
      actions={[
        { key: 'stay', label: 'Stay signed in', onClick: close },
        { key: 'out', label: 'Sign out', kind: 'primary', loading: isLoading, onClick: () => logout() },
      ]}
    >
      <SADialogSection title="What changes">
        <SADialogPoints
          kind="remove"
          points={[{ title: 'You are signed out everywhere.', detail: 'Any other browser or device using this account is signed out too.' }]}
        />
      </SADialogSection>
      <SADialogSection title="What stays the same">
        <SADialogPoints
          kind="keep"
          points={[{ title: 'Your business is exactly as you left it.', detail: 'Orders, listings and settings are all kept.' }]}
        />
      </SADialogSection>
    </SADialog>
  )
}

export default SignOutConfirmModal
