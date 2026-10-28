import { ArrowLeftOutlined } from '@ant-design/icons'
import { Link, Navigate, useNavigate } from 'react-router'
import styled from 'styled-components'
import SALoadError from 'src/components/SALoadError'
import SASplashScreen from 'src/components/SASplashScreen'
import AuthCard from 'src/pages/Auth/components/AuthCard'
import AuthError from 'src/pages/Auth/components/AuthError'
import AuthPanel from 'src/pages/Auth/components/AuthPanel'
import ResubmitForm from 'src/pages/Application/Resubmit/components/ResubmitForm'
import { PATHS } from 'src/router/paths'
import {
  useGetApplicationDetailsQuery,
  useGetApplicationQuery,
  useResubmitApplicationMutation,
} from 'src/store/application/actions'
import { ApplicationStatus } from 'src/store/application/types'
import { abnDigits, formatAbn } from 'src/utils/abn'

// "Update and resubmit" from the not-approved screen. Only a rejected application can be resubmitted (anything else is a 409),
// so anyone else is sent back to the screen that says where they stand.
const ResubmitPage = () => {
  const navigate = useNavigate()
  const { data: application, isLoading: loadingStatus } = useGetApplicationQuery()
  const rejected = application?.status === ApplicationStatus.rejected
  const { data: details, error, isLoading: loadingDetails, refetch } = useGetApplicationDetailsQuery(undefined, { skip: !rejected })
  const [resubmit, { isLoading: sending, error: sendError }] = useResubmitApplicationMutation()

  if (loadingStatus || loadingDetails) return <SASplashScreen />
  if (!rejected) return <Navigate to={PATHS.application} replace />
  if (!details) return <SALoadError what="your application" error={error} onRetry={refetch} />

  return (
    <AuthPanel
      wide
      title="Update your application"
      subtitle="Check your details and send them back for review. Your sign-in email and password stay as they are."
    >
      <AuthCard>
        <AuthError error={sendError} />
        <ResubmitForm
          email={details.email}
          loading={sending}
          initialValues={{
            businessName: details.businessName,
            abn: formatAbn(details.abn),
            businessType: details.businessType ?? undefined,
            contactName: details.contactName,
            phone: details.phone ?? '',
          }}
          // Only the fields the backend knows; the ABN goes as digits.
          onSubmit={async ({ businessName, abn, businessType, contactName, phone }) => {
            await resubmit({
              businessName: businessName.trim(),
              abn: abnDigits(abn),
              businessType: businessType?.trim() || undefined,
              contactName: contactName.trim(),
              phone: phone.trim(),
              confirmAuthorised: true,
            })
              .unwrap()
              .then(() => navigate(PATHS.application, { replace: true }))
              .catch(() => undefined)
          }}
        />
      </AuthCard>
      <Back to={PATHS.application}>
        <ArrowLeftOutlined /> Back
      </Back>
    </AuthPanel>
  )
}

export default ResubmitPage

const Back = styled(Link)`
  display: block;
  margin-top: ${({ theme }) => theme.marginLG}px;
  text-align: center;
`
