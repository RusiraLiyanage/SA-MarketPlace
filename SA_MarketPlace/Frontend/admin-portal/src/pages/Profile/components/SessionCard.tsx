import { Button, Typography } from 'antd'
import styled from 'styled-components'
import SACard from 'src/components/SACard'

// Signing out ends the account's tokens everywhere (backend ADR 0018), not just on this device, so the card says that.
const SessionCard = ({ onSignOut }: { onSignOut: () => void }) => (
  <SACard title="Session">
    <Button size="large" block onClick={onSignOut}>
      Sign out
    </Button>
    <Note type="secondary">Signing out ends your session on every device.</Note>
  </SACard>
)

export default SessionCard

const Note = styled(Typography.Paragraph)`
  && {
    margin: ${({ theme }) => theme.margin}px 0 0;
  }
`
