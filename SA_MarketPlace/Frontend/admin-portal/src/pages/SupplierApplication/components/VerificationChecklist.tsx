import { Alert, Checkbox, Typography } from 'antd'
import styled from 'styled-components'
import SACard from 'src/components/SACard'
import { VERIFICATION_CHECKS, VERIFICATION_STATUS_ID } from 'src/pages/SupplierApplication/verificationChecks'

interface Props {
  done: readonly string[]
  onChange: (done: readonly string[]) => void
}

// The manual check for Phase 1. The ticks are not saved (the backend has no field for them); they only unlock Approve on this
// screen, and the notice says so, so the disabled button is never unexplained. Reject never waits for them.
const VerificationChecklist = ({ done, onChange }: Props) => {
  const complete = done.length === VERIFICATION_CHECKS.length
  const toggle = (check: string, checked: boolean) => onChange(checked ? [...done, check] : done.filter((item) => item !== check))

  return (
    <SACard title="Verification checklist">
      <Note type="secondary">Manual check for Phase 1; ABN lookup automation comes later. The ticks are for your own reference and are not saved.</Note>
      <List>
        {VERIFICATION_CHECKS.map((check) => (
          <li key={check}>
            <Checkbox checked={done.includes(check)} onChange={(event) => toggle(check, event.target.checked)}>
              {check}
            </Checkbox>
          </li>
        ))}
      </List>
      <Status
        id={VERIFICATION_STATUS_ID}
        role="status"
        showIcon
        type={complete ? 'success' : 'warning'}
        message={complete ? 'All checks done. You can approve this supplier.' : 'Tick all three checks to enable Approve supplier. You can reject without them.'}
      />
    </SACard>
  )
}

export default VerificationChecklist

const Note = styled(Typography.Paragraph)`
  && {
    margin-bottom: ${({ theme }) => theme.margin}px;
    font-size: ${({ theme }) => theme.fontSizeSM}px;
  }
`

const List = styled.ul`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.marginSM}px;
  margin: 0;
  padding: 0;
  list-style: none;
`

const Status = styled(Alert)`
  margin-top: ${({ theme }) => theme.margin}px;
`
