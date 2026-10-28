import { Col, Form, Input, Row, Select } from 'antd'
import styled from 'styled-components'
import { AU_STATES } from 'src/constants'
import type { DeliveryValues } from 'src/pages/Checkout/checkoutOutletContext'
import { requiredText } from 'src/utils/formRules'
import { requiredMarkAfter } from 'src/utils/requiredMark'
import { SASectionTitle } from 'src/components/SATitle'

interface Props {
  /** The id the page's submit button points at, so the button can sit in the order summary. */
  formId: string
  organisationName: string
  initialValues?: DeliveryValues
  onSubmit: (values: DeliveryValues) => void
}

const DEFAULTS: Partial<DeliveryValues> = { state: 'NSW' }

const DeliveryForm = ({ formId, organisationName, initialValues, onSubmit }: Props) => (
  <Card>
    <SASectionTitle>Delivery address</SASectionTitle>
    <Form<DeliveryValues>
      id={formId}
      layout="vertical"
      requiredMark={requiredMarkAfter}
      initialValues={initialValues ?? DEFAULTS}
      onFinish={onSubmit}
    >
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item label="Attention name" name="attentionName" rules={[{ max: 150, message: 'Name is too long' }]}>
            <Input placeholder="Enter name" autoComplete="name" />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item label="Organisation" htmlFor="delivery-organisation">
            <Input id="delivery-organisation" value={organisationName} readOnly disabled />
          </Form.Item>
        </Col>
      </Row>
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item label="Street address" name="streetAddress" rules={requiredText('street address', 255)}>
            <Input placeholder="Enter street address" autoComplete="street-address" />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item label="Suburb" name="suburb" rules={requiredText('suburb', 120)}>
            <Input placeholder="Enter suburb" autoComplete="address-level2" />
          </Form.Item>
        </Col>
      </Row>
      <Row gutter={16}>
        <Col span={8}>
          <Form.Item label="State" name="state" rules={[{ required: true, message: 'Choose a state' }]}>
            <Select options={AU_STATES.map((state) => ({ value: state, label: state }))} />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item
            label="Postcode"
            name="postcode"
            rules={[
              { required: true, message: 'Enter your postcode' },
              { pattern: /^\d{4}$/, message: 'Postcode must be 4 digits' },
            ]}
          >
            <Input placeholder="Enter postcode" inputMode="numeric" maxLength={4} autoComplete="postal-code" />
          </Form.Item>
        </Col>
        <Col span={8}>
          <Form.Item label="Country" htmlFor="delivery-country">
            <Input id="delivery-country" value="Australia" readOnly disabled />
          </Form.Item>
        </Col>
      </Row>
      <Form.Item label="Delivery notes (optional)" name="notes" rules={[{ max: 500, message: 'Notes must be 500 characters or fewer' }]}>
        <Input.TextArea rows={3} placeholder="Add delivery instructions here..." />
      </Form.Item>
    </Form>
  </Card>
)

export default DeliveryForm

const Card = styled.section`
  padding: ${({ theme }) => theme.padding}px;
  background: ${({ theme }) => theme.colorBgContainer};
  border-radius: ${({ theme }) => theme.borderRadiusLG}px;
`
