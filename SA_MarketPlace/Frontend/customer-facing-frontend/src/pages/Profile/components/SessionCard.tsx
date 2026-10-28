import { Button, Typography } from 'antd'
import styled from 'styled-components'
import ProfileCard from 'src/pages/Profile/components/ProfileCard'
import { SASectionTitle } from 'src/components/SATitle'

interface Props {
  onSignOut: () => void
}

// Signing out ends the account's tokens everywhere (ADR 0018), not just on this device, so the card says that.
const SessionCard = ({ onSignOut }: Props) => (
  <ProfileCard aria-label="Session">
    <SASectionTitle>Session</SASectionTitle>
    <Button size="large" block onClick={onSignOut}>
      Sign out
    </Button>
    <Note type="secondary">Signing out ends your session on every device.</Note>
  </ProfileCard>
)

export default SessionCard

const Note = styled(Typography.Paragraph)`
  && {
    margin: ${({ theme }) => theme.margin}px 0 0;
  }
`
