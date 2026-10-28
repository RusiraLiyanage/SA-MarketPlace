import { Alert, App, AutoComplete, Button, Col, Flex, Form, Input, InputNumber, Row, Tag, Typography } from 'antd'
import { useState } from 'react'
import { useNavigate } from 'react-router'
import styled from 'styled-components'
import SACard from 'src/components/SACard'
import SAFormItem from 'src/components/SAFormItem'
import SAPageHeader from 'src/components/SAPageHeader'
import UnsavedChangesDialog from 'src/components/UnsavedChangesDialog'
import { BUSINESS_TYPE_OPTIONS } from 'src/constants'
import { useUnsavedChanges } from 'src/hooks/useUnsavedChanges'
import { getErrorMessage } from 'src/infra/errors'
import ReadOnlyField from 'src/pages/BusinessProfile/components/ReadOnlyField'
import ChangePasswordForm from 'src/pages/BusinessProfile/components/ChangePasswordForm'
import { profileChanges, toProfileFormValues, type ProfileFormValues } from 'src/pages/BusinessProfile/profileChanges'
import { PATHS } from 'src/router/paths'
import { useUpdateProfileMutation } from 'src/store/profile/actions'
import type { BusinessProfile } from 'src/store/profile/types'
import { formatAbn } from 'src/utils/abn'
import { formatDate } from 'src/utils/format'
import { contactNameRules, phoneRules } from 'src/utils/formRules'
import { requiredMarkAfter } from 'src/utils/requiredMark'

// The business profile: what the seller can change (type, contact, fulfilment) and what only Sample Assist can (name, ABN).
// Save changes sends only the fields that differ, so a save never rewrites what the seller did not touch.
const ProfileView = ({ profile }: { profile: BusinessProfile }) => {
  const { message } = App.useApp()
  const navigate = useNavigate()
  const [form] = Form.useForm<ProfileFormValues>()
  const [update, { isLoading }] = useUpdateProfileMutation()
  const [saving, setSaving] = useState(false)
  const edited = Form.useWatch([], form)
  const { blocker } = useUnsavedChanges(Object.keys(profileChanges(profile, edited ?? toProfileFormValues(profile))).length > 0)

  // True when the changes were saved; false when the form needs fixing, there was nothing to save or the backend refused.
  const save = async (): Promise<boolean> => {
    let values: ProfileFormValues
    try {
      values = await form.validateFields()
    } catch {
      return false
    }
    const changes = profileChanges(profile, values)
    if (Object.keys(changes).length === 0) {
      message.info('There are no changes to save')
      return false
    }

    setSaving(true)
    try {
      const saved = await update(changes).unwrap()
      form.setFieldsValue(toProfileFormValues(saved))
      message.success('Profile saved')
      return true
    } catch (error) {
      message.error(getErrorMessage(error))
      return false
    } finally {
      setSaving(false)
    }
  }

  const { approvedAt } = profile.verification

  return (
    <Page>
      <SAPageHeader
        title="Business profile"
        extra={
          <Button type="primary" size="large" loading={saving || isLoading} onClick={save}>
            Save changes
          </Button>
        }
      />
      <Alert
        showIcon
        type="success"
        title="Verified supplier"
        description={approvedAt ? `Approved by Sample Assist on ${formatDate(approvedAt)}.` : 'Approved by Sample Assist.'}
      />
      <Row gutter={[24, 24]}>
        <Col xs={24} xl={14}>
          {/* Not a <form>: Save changes in the header submits it, and the password form below is a real form of its own. */}
          <Form<ProfileFormValues> component={false} form={form} layout="vertical" requiredMark={requiredMarkAfter} initialValues={toProfileFormValues(profile)}>
            <Stack>
              <SACard title="Business details">
                <Row gutter={16}>
                  <Col span={12}>
                    <ReadOnlyField label="Business / trading name" value={profile.business.businessName} />
                  </Col>
                  <Col span={12}>
                    <ReadOnlyField label="ABN" value={formatAbn(profile.business.abn)} />
                  </Col>
                </Row>
                <Form.Item label="Business type" name="businessType" rules={[{ max: 100, message: 'Business type is too long' }]}>
                  <AutoComplete options={BUSINESS_TYPE_OPTIONS} placeholder="Select or type a business type" />
                </Form.Item>
                <SAFormItem label="Product categories" extra="Worked out from your listings.">
                  <Flex gap="small" wrap>
                    {profile.productCategories.length > 0 ? (
                      profile.productCategories.map((category) => <Tag key={category}>{category}</Tag>)
                    ) : (
                      <Typography.Text type="secondary">None yet</Typography.Text>
                    )}
                  </Flex>
                </SAFormItem>
                <Typography.Text type="secondary">
                  The business name and ABN were verified by Sample Assist. To change them, contact support.
                </Typography.Text>
              </SACard>

              <SACard title="Primary contact">
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item label="Contact name" name="contactName" rules={contactNameRules}>
                      <Input autoComplete="name" />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item label="Phone number" name="phone" rules={phoneRules}>
                      <Input type="tel" autoComplete="tel" />
                    </Form.Item>
                  </Col>
                </Row>
              </SACard>

              <SACard title="Fulfilment settings">
                <Row gutter={16}>
                  <Col span={12}>
                    <SAFormItem
                      label="Dispatch SLA (hours)"
                      name="dispatchSlaHours"
                      extra="How long you have to dispatch an order after it is placed."
                      rules={[{ required: true, type: 'integer', min: 1, max: 168, message: 'Enter a whole number of hours from 1 to 168' }]}
                    >
                      <InputNumber min={1} max={168} precision={0} style={{ width: '100%' }} />
                    </SAFormItem>
                  </Col>
                  <Col span={12}>
                    <SAFormItem
                      label="Default carrier"
                      name="defaultCarrier"
                      extra="Fills the carrier when you dispatch an order."
                      rules={[{ max: 100, message: 'Carrier name is too long' }]}
                    >
                      <Input placeholder="e.g. Australia Post" />
                    </SAFormItem>
                  </Col>
                </Row>
              </SACard>
            </Stack>
          </Form>
        </Col>

        <Col xs={24} xl={10}>
          <Stack>
            <SACard title="Account & security">
              <Form component={false} layout="vertical">
                <ReadOnlyField label="Sign-in email" value={profile.email} extra="Changing the sign-in email is not available yet." />
              </Form>
              <ChangePasswordForm passwordLength={profile.passwordLength} />
            </SACard>
            <SACard title="Session">
              <Flex justify="space-between" align="center" gap="middle" wrap>
                <Typography.Text type="secondary">Sign out of the seller portal on this device.</Typography.Text>
                <Button onClick={() => navigate(PATHS.signOut)}>Sign out</Button>
              </Flex>
            </SACard>
          </Stack>
        </Col>
      </Row>
      <UnsavedChangesDialog blocker={blocker} onSave={save} />
    </Page>
  )
}

export default ProfileView

const Page = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.margin}px;
`

const Stack = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.margin}px;
`
