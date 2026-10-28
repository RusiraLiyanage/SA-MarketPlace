import { Button, Col, Form, Input, Row, type FormInstance } from 'antd'
import styled from 'styled-components'
import SACard from 'src/components/SACard'
import ReadOnlyField from 'src/pages/Profile/components/ReadOnlyField'
import type { PersonalDetailsValues } from 'src/pages/Profile/profileChanges'
import { roleLabels } from 'src/store/profile/selector'
import type { MyAdminProfile } from 'src/store/profile/types'
import { contactNameRules } from 'src/utils/formRules'
import { requiredMarkAfter } from 'src/utils/requiredMark'

interface Props {
  profile: MyAdminProfile
  /** The page owns the form, so it can tell whether anything is unsaved and save it from the leave prompt. */
  form: FormInstance<PersonalDetailsValues>
  onSave: (values: PersonalDetailsValues) => unknown
  loading?: boolean
}

// Only the name can be changed (PATCH /auth/profile, backend ADR 0028); the role and the sign-in email are shown, not editable.
const PersonalDetailsForm = ({ profile, form, onSave, loading }: Props) => (
  <SACard title="Personal details">
    <Form<PersonalDetailsValues>
      form={form}
      layout="vertical"
      requiredMark={requiredMarkAfter}
      initialValues={{ fullName: profile.fullName }}
      onFinish={onSave}
    >
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item label="Full name" name="fullName" rules={contactNameRules}>
            <Input autoComplete="name" />
          </Form.Item>
        </Col>
        <Col span={12}>
          <ReadOnlyField label="Role" value={roleLabels(profile.roles)} extra="Role is assigned by the platform, not editable here." />
        </Col>
      </Row>
      <ReadOnlyField label="Work email address" value={profile.email} extra="Used for sign-in and supplier application notifications." />
      <Actions>
        <Button type="primary" htmlType="submit" size="large" loading={loading}>
          Save changes
        </Button>
      </Actions>
    </Form>
  </SACard>
)

export default PersonalDetailsForm

const Actions = styled.div`
  display: flex;
  justify-content: flex-end;
`
