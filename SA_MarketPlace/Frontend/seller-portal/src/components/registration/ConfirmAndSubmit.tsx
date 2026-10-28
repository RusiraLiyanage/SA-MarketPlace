import { Button, Checkbox, Form } from 'antd'
import { acceptTermsRules } from 'src/utils/formRules'

interface Props {
  loading?: boolean
  label: string
}

// The authorisation box and the submit button that end a supplier application. It renders inside a Form.
const ConfirmAndSubmit = ({ loading, label }: Props) => (
  <>
    <Form.Item
      name="confirmAuthorised"
      valuePropName="checked"
      rules={acceptTermsRules('Confirm that you are authorised to register this business')}
    >
      <Checkbox>I confirm the details above are accurate and I am authorised to register this business.</Checkbox>
    </Form.Item>
    <Form.Item>
      <Button type="primary" htmlType="submit" size="large" block loading={loading}>
        {label}
      </Button>
    </Form.Item>
  </>
)

export default ConfirmAndSubmit
