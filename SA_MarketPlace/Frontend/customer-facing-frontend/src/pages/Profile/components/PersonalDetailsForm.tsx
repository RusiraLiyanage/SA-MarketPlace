import { Button, Col, Form, Input, Row, type FormInstance } from 'antd'
import styled from 'styled-components'
import SAFormItem from 'src/components/SAFormItem'
import ProfileCard from 'src/pages/Profile/components/ProfileCard'
import { requiredText } from 'src/utils/formRules'
import { requiredMarkAfter } from 'src/utils/requiredMark'
import type { MyProfile } from 'src/types'
import { SASectionTitle } from 'src/components/SATitle'

// Only these three can be changed (PATCH /auth/profile); the email and organisation are shown but fixed.
export interface PersonalDetailsValues {
  firstName: string
  lastName: string
  phone: string
}

interface Props {
  profile: Pick<MyProfile, 'firstName' | 'lastName' | 'email' | 'organisationName' | 'phone'>
  onSave?: (values: PersonalDetailsValues) => unknown
  loading?: boolean
  /** The page owns the form, so it can tell whether anything is unsaved and save it from the leave prompt. */
  form?: FormInstance<PersonalDetailsValues>
}

const PersonalDetailsForm = ({ profile, onSave, loading, form }: Props) => {
  const { firstName, lastName, email, organisationName, phone } = profile

  return (
    <ProfileCard aria-label="Personal details">
      <SASectionTitle>Personal details</SASectionTitle>
      <Form<PersonalDetailsValues>
        form={form}
        layout="vertical"
        requiredMark={requiredMarkAfter}
        initialValues={{ firstName, lastName, phone: phone ?? '' }}
        onFinish={onSave}
      >
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item label="First name" name="firstName" rules={requiredText('first name')}>
              <Input autoComplete="given-name" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="Last name" name="lastName" rules={requiredText('last name')}>
              <Input autoComplete="family-name" />
            </Form.Item>
          </Col>
        </Row>
        <SAFormItem label="Email address" extra="Used to sign in. It can't be changed here.">
          <Input value={email} disabled aria-label="Email address" />
        </SAFormItem>
        <Row gutter={16}>
          <Col span={12}>
            <SAFormItem label="Organisation" extra="Orders and invoices are issued to it.">
              <Input value={organisationName ?? ''} disabled aria-label="Organisation" />
            </SAFormItem>
          </Col>
          <Col span={12}>
            <Form.Item
              label="Phone"
              name="phone"
              // The backend can set a phone number but not clear one, so once there is one it stays.
              rules={[
                ...(phone ? [{ required: true, whitespace: true, message: 'A phone number cannot be removed, only changed' }] : []),
                { max: 32, message: 'Phone number is too long' },
              ]}
              extra={phone ? undefined : 'Optional'}
            >
              <Input type="tel" autoComplete="tel" />
            </Form.Item>
          </Col>
        </Row>
        <Actions>
          <Button type="primary" htmlType="submit" size="large" loading={loading}>
            Save changes
          </Button>
        </Actions>
      </Form>
    </ProfileCard>
  )
}

export default PersonalDetailsForm

const Actions = styled.div`
  display: flex;
  justify-content: flex-end;
`
