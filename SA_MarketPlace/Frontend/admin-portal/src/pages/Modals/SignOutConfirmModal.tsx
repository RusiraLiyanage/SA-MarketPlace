import SADialog, { SADialogPoints, SADialogSection } from 'src/components/SADialog'
import { useRouteModal } from 'src/hooks/useRouteModal'
import { useLogoutMutation } from 'src/store/auth/actions'

// Opens over My profile (its Sign out button links here). Signing out ends the account's tokens on every
// device (backend ADR 0018); once the session is gone PrivateRoute takes the admin to sign in.
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
          points={[{ title: 'Suppliers and orders are not affected.', detail: 'Decisions you made are already saved.' }]}
        />
      </SADialogSection>
    </SADialog>
  )
}

export default SignOutConfirmModal
