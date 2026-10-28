import { Form, Input } from 'antd'
import BusinessSections, { type BusinessValues } from 'src/components/registration/BusinessSections'
import ConfirmAndSubmit from 'src/components/registration/ConfirmAndSubmit'
import FormSection from 'src/components/registration/FormSection'
import { SASectionTitle } from 'src/components/SATitle'
import { requiredMarkAfter } from 'src/utils/requiredMark'

export type ResubmitValues = BusinessValues

interface Props {
  /** The sign-in email, shown read-only: changing it needs a flow that does not exist yet. */
  email: string
  initialValues: Partial<ResubmitValues>
  onSubmit?: (values: ResubmitValues) => void
  loading?: boolean
}

// The registration form minus the sign-in details, pre-filled. The seller confirms the authorisation again.
const ResubmitForm = ({ email, initialValues, onSubmit, loading }: Props) => (
  <Form<ResubmitValues> layout="vertical" requiredMark={requiredMarkAfter} initialValues={initialValues} onFinish={onSubmit}>
    <BusinessSections />

    <FormSection>
      <SASectionTitle>Sign-in details</SASectionTitle>
      <Form.Item label="Email address" extra="Used to sign in. It can't be changed here.">
        <Input value={email} disabled aria-label="Email address" />
      </Form.Item>
    </FormSection>

    <ConfirmAndSubmit loading={loading} label="Resubmit for review" />
  </Form>
)

export default ResubmitForm
