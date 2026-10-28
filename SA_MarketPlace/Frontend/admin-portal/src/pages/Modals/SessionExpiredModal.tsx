import { ClockCircleOutlined } from '@ant-design/icons'
import { useLocation, useNavigate } from 'react-router'
import SADialog, { SADialogPoints, SADialogSection } from 'src/components/SADialog'
import { PATHS } from 'src/router/paths'

// Not a child of a page: an expired session sends the admin here, and the only way on is to sign in again, which
// returns them to the page they were on.
const SessionExpiredModal = () => {
  const navigate = useNavigate()
  const { state } = useLocation()
  const signIn = () => navigate(PATHS.login, { state })

  return (
    <SADialog
      tone="warning"
      icon={<ClockCircleOutlined />}
      title="Your session has expired"
      summary="You were signed out to keep your account safe."
      dismissible={false}
      onCancel={signIn}
      actions={[{ key: 'sign-in', label: 'Sign in', kind: 'primary', onClick: signIn }]}
    >
      <SADialogSection title="What changes">
        <SADialogPoints
          kind="remove"
          points={[{ title: 'Anything not saved is lost.', detail: 'Sessions last 15 minutes, so save as you go.' }]}
        />
      </SADialogSection>
      <SADialogSection title="What stays the same">
        <SADialogPoints
          kind="keep"
          points={[
            { title: 'Everything you saved is safe.', detail: 'Decisions you made are already recorded.' },
            { title: 'You come back to this page.', detail: 'Sign in and you pick up where you left off.' },
          ]}
        />
      </SADialogSection>
    </SADialog>
  )
}

export default SessionExpiredModal
