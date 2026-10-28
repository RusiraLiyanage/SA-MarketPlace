import { Button, Form, Input, Typography } from 'antd'
import styled from 'styled-components'
import SAFormItem from 'src/components/SAFormItem'
import ProfileCard from 'src/pages/Profile/components/ProfileCard'
import { PASSWORD_HINT } from 'src/patterns/patterns'
import { confirmPasswordRules, newPasswordRules } from 'src/utils/formRules'
import { requiredMarkAfter } from 'src/utils/requiredMark'
import { SASectionTitle } from 'src/components/SATitle'

export interface ChangePasswordValues {
  newPassword: string
  confirmPassword: string
}

interface Props {
  /** Sizes the dots; the password itself never reaches the browser. */
  passwordLength: number
  /** Resolves true when the password was changed, so the fields are cleared only then. */
  onSubmit?: (values: ChangePasswordValues) => Promise<boolean> | boolean | void
  loading?: boolean
}

// The backend does not ask for the current password (ADR 0030): the signed-in session is the proof. It is shown as
// dots so the buyer can see one is set, and changing it signs out every other device.
const ChangePasswordForm = ({ passwordLength, onSubmit, loading }: Props) => {
  const [form] = Form.useForm<ChangePasswordValues>()

  return (
    <ProfileCard aria-label="Change password">
      <SASectionTitle>Change password</SASectionTitle>
      <Form<ChangePasswordValues>
        form={form}
        layout="vertical"
        requiredMark={requiredMarkAfter}
        onFinish={async (values) => {
          if ((await onSubmit?.(values)) !== false) form.resetFields()
        }}
      >
        <Form.Item label="Current password">
          <Input.Password value={'•'.repeat(passwordLength)} readOnly visibilityToggle={false} aria-label="Current password" />
        </Form.Item>
        <SAFormItem label="New password" name="newPassword" rules={newPasswordRules} extra={PASSWORD_HINT}>
          <Input.Password placeholder="Enter new password" autoComplete="new-password" />
        </SAFormItem>
        <Form.Item
          label="Confirm new password"
          name="confirmPassword"
          dependencies={['newPassword']}
          rules={confirmPasswordRules('newPassword')}
        >
          <Input.Password placeholder="Re-enter new password" autoComplete="new-password" />
        </Form.Item>
        <Button htmlType="submit" size="large" loading={loading}>
          Update password
        </Button>
        <Note type="secondary">Your other devices will be signed out.</Note>
      </Form>
    </ProfileCard>
  )
}

export default ChangePasswordForm

// The same small grey text as the field hints above, set a little apart from the button.
const Note = styled(Typography.Paragraph)`
  && {
    margin: ${({ theme }) => theme.marginSM}px 0 0;
    font-size: ${({ theme }) => theme.fontSizeSM}px;
  }
`
