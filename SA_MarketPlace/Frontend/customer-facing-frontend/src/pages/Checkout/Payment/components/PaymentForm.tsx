import { Alert, Col, Form, Input, Radio, Row } from 'antd'
import styled from 'styled-components'
import type { PaymentMethod } from 'src/types'
import { formatCardNumber, formatExpiry, isExpired, isValidCardNumber, parseExpiry } from 'src/utils/card'
import { requiredMarkAfter } from 'src/utils/requiredMark'
import { SASectionTitle } from 'src/components/SATitle'

export interface PaymentValues {
  method: PaymentMethod
  nameOnCard?: string
  number?: string
  expiry?: string
  cvc?: string
}

interface Props {
  /** The id the page's Place order button points at, so the button can sit in the order summary. */
  formId: string
  onSubmit: (values: PaymentValues) => void
}

const PaymentForm = ({ formId, onSubmit }: Props) => {
  const [form] = Form.useForm<PaymentValues>()
  const method = Form.useWatch('method', form)
  const isCard = method !== 'invoice_on_account'

  return (
    <Card>
      <SASectionTitle>Payment method</SASectionTitle>
      <Form<PaymentValues>
        id={formId}
        form={form}
        layout="vertical"
        requiredMark={requiredMarkAfter}
        initialValues={{ method: 'card_mock' }}
        onFinish={onSubmit}
      >
        <Form.Item name="method">
          <Radio.Group orientation="vertical">
            <Radio value="card_mock">Credit / debit card (mock)</Radio>
            <Radio value="invoice_on_account">Invoice on account</Radio>
          </Radio.Group>
        </Form.Item>

        {isCard && (
          <>
            <Form.Item
              label="Name on card"
              name="nameOnCard"
              rules={[
                { required: true, whitespace: true, message: 'Enter the name on the card' },
                { max: 100, message: 'Name is too long' },
              ]}
            >
              <Input placeholder="Name as shown on the card" autoComplete="cc-name" />
            </Form.Item>
            <Form.Item
              label="Card number"
              name="number"
              normalize={formatCardNumber}
              rules={[
                { required: true, message: 'Enter the card number' },
                { validator: (_rule, value) => (!value || isValidCardNumber(value) ? Promise.resolve() : Promise.reject(new Error('Enter a valid card number'))) },
              ]}
            >
              <Input placeholder="1234 5678 9012 3456" inputMode="numeric" autoComplete="cc-number" />
            </Form.Item>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  label="Expiry date"
                  name="expiry"
                  normalize={formatExpiry}
                  rules={[
                    { required: true, message: 'Enter the expiry date' },
                    {
                      validator: (_rule, value) => {
                        if (!value) return Promise.resolve()
                        const expiry = parseExpiry(value)
                        if (!expiry) return Promise.reject(new Error('Use the format MM / YY'))
                        return isExpired(expiry) ? Promise.reject(new Error('This card has expired')) : Promise.resolve()
                      },
                    },
                  ]}
                >
                  <Input placeholder="MM / YY" inputMode="numeric" autoComplete="cc-exp" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  label="CVC"
                  name="cvc"
                  rules={[
                    { required: true, message: 'Enter the CVC' },
                    { pattern: /^\d{3,4}$/, message: 'CVC must be 3 or 4 digits' },
                  ]}
                >
                  <Input placeholder="123" inputMode="numeric" maxLength={4} autoComplete="cc-csc" />
                </Form.Item>
              </Col>
            </Row>
            <Alert
              type="info"
              title="This is a mock sandbox payment. No real payment is processed and no card data is stored."
            />
          </>
        )}
      </Form>
    </Card>
  )
}

export default PaymentForm

const Card = styled.section`
  padding: ${({ theme }) => theme.padding}px;
  background: ${({ theme }) => theme.colorBgContainer};
  border-radius: ${({ theme }) => theme.borderRadiusLG}px;
`
