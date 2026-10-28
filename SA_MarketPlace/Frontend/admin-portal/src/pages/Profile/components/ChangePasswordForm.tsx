import { App, Button, Form, Input, Typography } from 'antd'
import styled from 'styled-components'
import SAFormItem from 'src/components/SAFormItem'
import ReadOnlyField from 'src/pages/Profile/components/ReadOnlyField'
import { getErrorMessage } from 'src/infra/errors'
import { PASSWORD_HINT } from 'src/patterns/patterns'
import { useChangePasswordMutation } from 'src/store/profile/actions'
import { confirmPasswordRules, newPasswordRules } from 'src/utils/formRules'
import { requiredMarkAfter } from 'src/utils/requiredMark'

interface Values {
  newPassword: string
  confirmPassword: string
}

// The current password never reaches the browser; the dots only show how long it is. The signed-in session is the proof (backend ADR 0030).
const ChangePasswordForm = ({ passwordLength }: { passwordLength: number }) => {
  const { message } = App.useApp()
  const [form] = Form.useForm<Values>()
  const [changePassword, { isLoading }] = useChangePasswordMutation()

  const submit = async ({ newPassword }: Values) => {
    try {
      await changePassword({ newPassword }).unwrap()
      form.resetFields()
      message.success('Password updated')
    } catch (error) {
      message.error(getErrorMessage(error))
    }
  }

  return (
    <Form<Values> form={form} layout="vertical" requiredMark={requiredMarkAfter} onFinish={submit}>
      <ReadOnlyField label="Current password" value={'•'.repeat(passwordLength)} disabled={false} />
      <SAFormItem label="New password" name="newPassword" rules={newPasswordRules} extra={PASSWORD_HINT}>
        <Input.Password placeholder="Create new password" autoComplete="new-password" />
      </SAFormItem>
      <Form.Item label="Confirm new password" name="confirmPassword" dependencies={['newPassword']} rules={confirmPasswordRules('newPassword')}>
        <Input.Password placeholder="Re-enter new password" autoComplete="new-password" />
      </Form.Item>
      <Button htmlType="submit" loading={isLoading}>
        Update password
      </Button>
      <Note type="secondary">Your other devices will be signed out.</Note>
    </Form>
  )
}

export default ChangePasswordForm

const Note = styled(Typography.Text)`
  display: block;
  margin-top: ${({ theme }) => theme.marginSM}px;
  font-size: ${({ theme }) => theme.fontSizeSM}px;
`
