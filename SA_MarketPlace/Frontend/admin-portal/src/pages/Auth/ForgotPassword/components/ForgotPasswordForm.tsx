import { Button, Form, Input } from 'antd'
import { emailRules } from 'src/utils/formRules'
import { requiredMarkAfter } from 'src/utils/requiredMark'

export interface ForgotPasswordValues {
  email: string
}

interface Props {
  onSubmit?: (values: ForgotPasswordValues) => void
  loading?: boolean
}

const ForgotPasswordForm = ({ onSubmit, loading }: Props) => (
  <Form<ForgotPasswordValues> layout="vertical" requiredMark={requiredMarkAfter} onFinish={onSubmit}>
    <Form.Item label="Work email address" name="email" rules={emailRules}>
      <Input placeholder="name@sampleassist.com.au" autoComplete="email" />
    </Form.Item>
    <Form.Item>
      <Button type="primary" htmlType="submit" size="large" block loading={loading}>
        Send reset link
      </Button>
    </Form.Item>
  </Form>
)

export default ForgotPasswordForm
