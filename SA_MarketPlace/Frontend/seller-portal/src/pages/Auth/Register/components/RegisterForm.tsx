import { Col, Form, Input, Row } from 'antd'
import styled from 'styled-components'
import BusinessSections, { type BusinessValues } from 'src/components/registration/BusinessSections'
import ConfirmAndSubmit from 'src/components/registration/ConfirmAndSubmit'
import FormSection from 'src/components/registration/FormSection'
import SAFormItem from 'src/components/SAFormItem'
import { SASectionTitle } from 'src/components/SATitle'
import { PASSWORD_HINT } from 'src/patterns/patterns'
import { confirmPasswordRules, emailRules, newPasswordRules } from 'src/utils/formRules'
import { requiredMarkAfter } from 'src/utils/requiredMark'

export interface RegisterValues extends BusinessValues {
  email: string
  password: string
  confirmPassword: string
}

interface Props {
  onSubmit?: (values: RegisterValues) => void
  loading?: boolean
}

const RegisterForm = ({ onSubmit, loading }: Props) => (
  <Form<RegisterValues> layout="vertical" requiredMark={requiredMarkAfter} onFinish={onSubmit}>
    <BusinessSections />

    <FormSection>
      <SASectionTitle>Account credentials</SASectionTitle>
      <Note>You&apos;ll sign in with these once your application is approved.</Note>
      <Form.Item label="Email address (used to sign in)" name="email" rules={emailRules}>
        <Input placeholder="name@business.com.au" autoComplete="email" />
      </Form.Item>
      <Row gutter={16}>
        <Col span={12}>
          <SAFormItem label="Password" name="password" rules={newPasswordRules} extra={PASSWORD_HINT}>
            <Input.Password placeholder="Create password" autoComplete="new-password" />
          </SAFormItem>
        </Col>
        <Col span={12}>
          <Form.Item
            label="Confirm password"
            name="confirmPassword"
            dependencies={['password']}
            rules={confirmPasswordRules('password')}
          >
            <Input.Password placeholder="Re-enter password" autoComplete="new-password" />
          </Form.Item>
        </Col>
      </Row>
    </FormSection>

    <ConfirmAndSubmit loading={loading} label="Submit for review" />
  </Form>
)

export default RegisterForm

const Note = styled.p`
  margin: -${({ theme }) => theme.marginXS}px 0 ${({ theme }) => theme.margin}px;
  color: ${({ theme }) => theme.colorTextDescription};
  font-size: ${({ theme }) => theme.fontSizeSM}px;
`
