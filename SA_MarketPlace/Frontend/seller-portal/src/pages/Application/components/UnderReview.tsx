import styled from 'styled-components'
import DetailsCard from 'src/pages/Application/components/DetailsCard'
import SignOutLink from 'src/pages/Application/components/SignOutLink'
import StatusScreen from 'src/pages/Application/components/StatusScreen'
import SAToneTag from 'src/components/SAToneTag'
import { SUPPORT_EMAIL } from 'src/constants'
import type { PendingApplication } from 'src/store/application/types'
import { formatAbn } from 'src/utils/abn'
import { formatDate } from 'src/utils/format'

const UnderReview = ({ application }: { application: PendingApplication }) => (
  <StatusScreen
    tone="warning"
    title="Your application is under review"
    subtitle="Thanks for registering. A Sample Assist administrator will review your application before your listings go live."
  >
    <DetailsCard
      rows={[
        { label: 'Business name', value: application.businessName },
        { label: 'ABN', value: formatAbn(application.abn) },
        { label: 'Submitted', value: formatDate(application.submittedAt) },
        { label: 'Status', value: <SAToneTag tone="warning">Awaiting review</SAToneTag> },
      ]}
    />
    <Note>
      We&apos;ll email you as soon as a decision is made. Questions? Contact <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
    </Note>
    <SignOutLink />
  </StatusScreen>
)

export default UnderReview

const Note = styled.p`
  margin: ${({ theme }) => theme.marginXS}px 0 0;
  color: ${({ theme }) => theme.colorTextDescription};
  font-size: ${({ theme }) => theme.fontSizeSM}px;
`
