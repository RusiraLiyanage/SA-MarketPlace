import { App, Button } from 'antd'
import { useNavigate } from 'react-router'
import styled from 'styled-components'
import DetailsCard from 'src/pages/Application/components/DetailsCard'
import StatusScreen from 'src/pages/Application/components/StatusScreen'
import SAToneTag from 'src/components/SAToneTag'
import { getErrorMessage } from 'src/infra/errors'
import { PATHS } from 'src/router/paths'
import { useAcknowledgeApplicationMutation } from 'src/store/application/actions'
import type { ApprovedApplication } from 'src/store/application/types'
import { formatDate } from 'src/utils/format'

// The one-time notice. Proceeding tells the backend it was seen, so it never shows again, on any device.
const Approved = ({ application }: { application: ApprovedApplication }) => {
  const navigate = useNavigate()
  const [acknowledge, { isLoading }] = useAcknowledgeApplicationMutation()
  const { message } = App.useApp()
  // If the backend could not record it the notice would only come back at the next sign-in, so stay here and say why.
  const proceed = async () => {
    try {
      await acknowledge().unwrap()
      navigate(PATHS.dashboard, { replace: true })
    } catch (error) {
      message.error(getErrorMessage(error))
    }
  }

  return (
    <StatusScreen
      tone="success"
      title="You're approved — welcome aboard"
      subtitle={`${application.businessName} is now a verified marketplace supplier.`}
    >
      <DetailsCard
        rows={[
          { label: 'Business name', value: application.businessName },
          ...(application.approvedAt ? [{ label: 'Approved', value: formatDate(application.approvedAt) }] : []),
          { label: 'Status', value: <SAToneTag tone="success">Verified supplier</SAToneTag> },
        ]}
      />
      <Note>Next step: add your products in the catalogue — published listings become visible to buyers immediately.</Note>
      <Button type="primary" size="large" loading={isLoading} onClick={proceed}>
        Proceed to dashboard
      </Button>
    </StatusScreen>
  )
}

export default Approved

const Note = styled.p`
  margin: ${({ theme }) => theme.marginXS}px 0;
  color: ${({ theme }) => theme.colorTextDescription};
  font-size: ${({ theme }) => theme.fontSizeSM}px;
`
