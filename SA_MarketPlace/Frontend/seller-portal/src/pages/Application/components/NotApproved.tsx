import { Button, Flex, Typography } from 'antd'
import { useNavigate } from 'react-router'
import styled from 'styled-components'
import DetailsCard from 'src/pages/Application/components/DetailsCard'
import SignOutLink from 'src/pages/Application/components/SignOutLink'
import StatusScreen from 'src/pages/Application/components/StatusScreen'
import { PATHS } from 'src/router/paths'
import type { RejectedApplication } from 'src/store/application/types'
import { formatDate } from 'src/utils/format'

const NO_REASON = 'No reason was given. Please contact support.'

const NotApproved = ({ application }: { application: RejectedApplication }) => {
  const navigate = useNavigate()
  const { rejectionReason, reviewedAt, supportContact } = application

  return (
    <StatusScreen
      tone="error"
      title="Your application was not approved"
      subtitle="A Sample Assist administrator reviewed your registration and could not approve it at this time."
    >
      <DetailsCard
        rows={[
          { label: 'Business name', value: application.businessName },
          ...(reviewedAt ? [{ label: 'Reviewed', value: formatDate(reviewedAt) }] : []),
        ]}
      >
        <ReasonLabel>Reason provided</ReasonLabel>
        <Reason>{rejectionReason?.trim() || NO_REASON}</Reason>
      </DetailsCard>
      <Flex gap="middle" justify="center">
        <Button size="large" href={`mailto:${supportContact.email}`}>
          Contact support
        </Button>
        <Button type="primary" size="large" onClick={() => navigate(PATHS.resubmitApplication)}>
          Update and resubmit
        </Button>
      </Flex>
      {supportContact.phone && <Typography.Text type="secondary">Or call {supportContact.phone}</Typography.Text>}
      <SignOutLink />
    </StatusScreen>
  )
}

export default NotApproved

const ReasonLabel = styled.div`
  margin-bottom: ${({ theme }) => theme.marginXS}px;
  color: ${({ theme }) => theme.colorTextDescription};
  font-size: ${({ theme }) => theme.fontSizeSM}px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
`

const Reason = styled.p`
  margin: 0 0 ${({ theme }) => theme.marginXS}px;
  padding: ${({ theme }) => theme.paddingSM}px ${({ theme }) => theme.padding}px;
  background: ${({ theme }) => theme.colorErrorBg};
  border-radius: ${({ theme }) => theme.borderRadius}px;
  color: ${({ theme }) => theme.colorErrorText};
`
