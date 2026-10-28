import { AutoComplete, Col, Form, Input, Row } from 'antd'
import FormSection from 'src/components/registration/FormSection'
import { SASectionTitle } from 'src/components/SATitle'
import { BUSINESS_TYPE_OPTIONS } from 'src/constants'
import { formatAbn } from 'src/utils/abn'
import { abnRules, contactNameRules, phoneRules, requiredText } from 'src/utils/formRules'

/** The business and contact fields every supplier application has, whether it is new or being resubmitted. */
export interface BusinessValues {
  businessName: string
  /** As typed, with spaces; the page sends the digits. */
  abn: string
  businessType?: string
  contactName: string
  phone: string
  confirmAuthorised: boolean
}

// The "Business details" and "Primary contact" sections, as laid out in the designs. It renders inside a Form.
const BusinessSections = () => (
  <>
    <FormSection>
      <SASectionTitle>Business details</SASectionTitle>
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item label="Business / trading name" name="businessName" rules={requiredText('business name', 255)}>
            <Input placeholder="Enter business name" autoComplete="organization" />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item label="ABN" name="abn" rules={abnRules} normalize={formatAbn}>
            <Input placeholder="11 digit Australian Business Number" inputMode="numeric" />
          </Form.Item>
        </Col>
      </Row>
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item label="Business type" name="businessType" rules={[{ max: 100, message: 'Business type is too long' }]}>
            <AutoComplete options={BUSINESS_TYPE_OPTIONS} placeholder="Select or type a business type" />
          </Form.Item>
        </Col>
      </Row>
    </FormSection>

    <FormSection>
      <SASectionTitle>Primary contact</SASectionTitle>
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item label="Contact name" name="contactName" rules={contactNameRules}>
            <Input placeholder="Enter full name" autoComplete="name" />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item label="Phone number" name="phone" rules={phoneRules}>
            <Input type="tel" placeholder="Enter phone number" autoComplete="tel" />
          </Form.Item>
        </Col>
      </Row>
    </FormSection>
  </>
)

export default BusinessSections
