import { Button, Flex, Form, Input } from 'antd'
import { Link } from 'react-router'
import { PATHS } from 'src/router/paths'
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
    <Form.Item label="Email address" name="email" rules={emailRules}>
      <Input placeholder="name@company.com.au" autoComplete="email" />
    </Form.Item>
    <Form.Item>
      <Button type="primary" htmlType="submit" size="large" block loading={loading}>
        Send reset link
      </Button>
    </Form.Item>
    <Flex justify="center">
      <Link to={PATHS.login}>Back to sign in</Link>
    </Flex>
  </Form>
)

export default ForgotPasswordForm
