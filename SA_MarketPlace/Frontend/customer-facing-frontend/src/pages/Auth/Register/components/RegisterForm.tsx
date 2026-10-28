import { Button, Checkbox, Col, Form, Input, Row } from 'antd'
import styled from 'styled-components'
import SAFormItem from 'src/components/SAFormItem'
import { PASSWORD_HINT } from 'src/patterns/patterns'
import {
  acceptTermsRules,
  confirmPasswordRules,
  emailRules,
  newPasswordRules,
  requiredText,
} from 'src/utils/formRules'
import { requiredMarkAfter } from 'src/utils/requiredMark'

export interface RegisterValues {
  firstName: string
  lastName: string
  email: string
  organisation: string
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
    <Row gutter={16}>
      <Col span={12}>
        <Form.Item label="First name" name="firstName" rules={requiredText('first name')}>
          <Input placeholder="Enter first name" autoComplete="given-name" />
        </Form.Item>
      </Col>
      <Col span={12}>
        <Form.Item label="Last name" name="lastName" rules={requiredText('last name')}>
          <Input placeholder="Enter last name" autoComplete="family-name" />
        </Form.Item>
      </Col>
    </Row>
    <Form.Item label="Work email address" name="email" rules={emailRules}>
      <Input placeholder="name@company.com.au" autoComplete="email" />
    </Form.Item>
    <SAFormItem
      label="Organisation"
      name="organisation"
      rules={requiredText('organisation', 255)}
      extra="Orders and invoices will be issued to this organisation."
    >
      <Input placeholder="e.g. SA Clinics Pty Ltd" autoComplete="organization" />
    </SAFormItem>
    <SAFormItem label="Password" name="password" rules={newPasswordRules} extra={PASSWORD_HINT}>
      <Input.Password placeholder="Create password" autoComplete="new-password" />
    </SAFormItem>
    <Form.Item
      label="Confirm password"
      name="confirmPassword"
      dependencies={['password']}
      rules={confirmPasswordRules('password')}
    >
      <Input.Password placeholder="Re-enter password" autoComplete="new-password" />
    </Form.Item>
    <Form.Item
      name="acceptTerms"
      valuePropName="checked"
      rules={acceptTermsRules('You must accept the terms to register')}
    >
      <TermsCheckbox>
        I agree to the Terms of Service and confirm purchases are for legitimate workplace drug and
        alcohol testing purposes.
      </TermsCheckbox>
    </Form.Item>
    <Form.Item>
      <Button type="primary" htmlType="submit" size="large" block loading={loading}>
        Create account
      </Button>
    </Form.Item>
  </Form>
)

// The box lines up with the first line of text when the sentence wraps.
const TermsCheckbox = styled(Checkbox)`
  align-items: flex-start;

  .ant-checkbox {
    align-self: flex-start;
    margin-top: ${({ theme }) => theme.marginXXS}px;
  }
`

export default RegisterForm
