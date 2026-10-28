import { Button, Flex, Form, Input } from 'antd'
import { Link } from 'react-router'
import styled from 'styled-components'
import { PATHS } from 'src/router/paths'
import { emailRules } from 'src/utils/formRules'
import { requiredMarkAfter } from 'src/utils/requiredMark'

export interface LoginValues {
  email: string
  password: string
}

interface Props {
  onSubmit?: (values: LoginValues) => void
  loading?: boolean
}

const LoginForm = ({ onSubmit, loading }: Props) => (
  <Form<LoginValues> layout="vertical" requiredMark={requiredMarkAfter} onFinish={onSubmit}>
    <Form.Item label="Email address" name="email" rules={emailRules}>
      <Input placeholder="name@company.com.au" autoComplete="email" />
    </Form.Item>
    <Form.Item label="Password" name="password" rules={[{ required: true, message: 'Enter your password' }]}>
      <Input.Password placeholder="Enter password" autoComplete="current-password" />
    </Form.Item>
    <ForgotPassword justify="flex-end">
      <Link to={PATHS.forgotPassword}>Forgot password?</Link>
    </ForgotPassword>
    <Form.Item>
      <Button type="primary" htmlType="submit" size="large" block loading={loading}>
        Sign in
      </Button>
    </Form.Item>
  </Form>
)

const ForgotPassword = styled(Flex)`
  margin-bottom: ${({ theme }) => theme.marginLG}px;
`

export default LoginForm
