import { Button, Form, Input } from 'antd'
import SAFormItem from 'src/components/SAFormItem'
import { PASSWORD_HINT } from 'src/patterns/patterns'
import { confirmPasswordRules, newPasswordRules } from 'src/utils/formRules'
import { requiredMarkAfter } from 'src/utils/requiredMark'

export interface ResetPasswordValues {
  password: string
  confirmPassword: string
}

interface Props {
  onSubmit?: (values: ResetPasswordValues) => void
  loading?: boolean
}

const ResetPasswordForm = ({ onSubmit, loading }: Props) => (
  <Form<ResetPasswordValues> layout="vertical" requiredMark={requiredMarkAfter} onFinish={onSubmit}>
    <SAFormItem label="New password" name="password" rules={newPasswordRules} extra={PASSWORD_HINT}>
      <Input.Password placeholder="Create password" autoComplete="new-password" />
    </SAFormItem>
    <Form.Item
      label="Confirm new password"
      name="confirmPassword"
      dependencies={['password']}
      rules={confirmPasswordRules('password')}
    >
      <Input.Password placeholder="Re-enter password" autoComplete="new-password" />
    </Form.Item>
    <Form.Item>
      <Button type="primary" htmlType="submit" size="large" block loading={loading}>
        Update password
      </Button>
    </Form.Item>
  </Form>
)

export default ResetPasswordForm
