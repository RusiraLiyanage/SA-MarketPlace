import { Button, Checkbox, Col, Form, Input, Row } from 'antd'
import SAFormItem from 'src/components/SAFormItem'
import { PASSWORD_HINT } from 'src/patterns/patterns'
import { acceptTermsRules, confirmPasswordRules, contactNameRules, emailRules, newPasswordRules } from 'src/utils/formRules'
import { requiredMarkAfter } from 'src/utils/requiredMark'

export interface RegisterValues {
  fullName: string
  email: string
  password: string
  confirmPassword: string
  acceptTerms: boolean
}

interface Props {
  onSubmit?: (values: RegisterValues) => void
  loading?: boolean
}

const RegisterForm = ({ onSubmit, loading }: Props) => (
  <Form<RegisterValues> layout="vertical" requiredMark={requiredMarkAfter} onFinish={onSubmit}>
    <Form.Item label="Full name" name="fullName" rules={contactNameRules}>
      <Input placeholder="Enter your full name" autoComplete="name" />
    </Form.Item>
    <SAFormItem
      label="Work email address"
      name="email"
      rules={emailRules}
      extra="Only Sample Assist staff email addresses can register."
    >
      <Input placeholder="name@sampleassist.com.au" autoComplete="email" />
    </SAFormItem>
    <Row gutter={16}>
      <Col span={12}>
        <SAFormItem label="Password" name="password" rules={newPasswordRules} extra={PASSWORD_HINT}>
          <Input.Password placeholder="Create password" autoComplete="new-password" />
        </SAFormItem>
      </Col>
      <Col span={12}>
        <Form.Item label="Confirm password" name="confirmPassword" dependencies={['password']} rules={confirmPasswordRules('password')}>
          <Input.Password placeholder="Re-enter password" autoComplete="new-password" />
        </Form.Item>
      </Col>
    </Row>
    <Form.Item name="acceptTerms" valuePropName="checked" rules={acceptTermsRules('You must accept the terms to register')}>
      <Checkbox>I agree to the Terms of Service and will use this account only for Sample Assist work.</Checkbox>
    </Form.Item>
    <Form.Item>
      <Button type="primary" htmlType="submit" size="large" block loading={loading}>
        Create admin account
      </Button>
    </Form.Item>
  </Form>
)

export default RegisterForm
