import { App, Form, Input, Select } from 'antd'
import { useOutletContext } from 'react-router'
import SADialog, { SADialogPoints, SADialogSection } from 'src/components/SADialog'
import { REJECTION_DETAIL_MAX, REJECTION_REASONS } from 'src/constants'
import { useDecisionFailure } from 'src/hooks/useDecisionFailure'
import { useRouteModal } from 'src/hooks/useRouteModal'
import type { ApplicationOutletContext } from 'src/pages/SupplierApplication/applicationOutletContext'
import { useRejectSupplierMutation } from 'src/store/suppliers/actions'
import type { RejectionReason } from 'src/store/suppliers/types'

interface RejectValues {
  reason: RejectionReason
  detail?: string
}

// Opens over a pending application. The applicant is emailed the reason (the wording below, then the detail, exactly as written) and
// told they can update their details and resubmit; their listings stay hidden.
const RejectSupplierModal = () => {
  const { application } = useOutletContext<ApplicationOutletContext>()
  const { close } = useRouteModal()
  const { message } = App.useApp()
  const failed = useDecisionFailure()
  const [reject, { isLoading }] = useRejectSupplierMutation()
  const [form] = Form.useForm<RejectValues>()
  const reason = Form.useWatch('reason', form)

  const submit = async ({ reason, detail }: RejectValues) => {
    try {
      await reject({ supplierId: application.id, reason, detail: detail?.trim() || undefined }).unwrap()
      message.success(`${application.businessName} rejected`)
      close()
    } catch (error) {
      failed(error)
    }
  }

  return (
    <SADialog
      tone="danger"
      width={560}
      title="Reject this application?"
      summary={`${application.businessName} will be notified by email.`}
      onCancel={close}
      actions={[
        { key: 'keep', label: 'Keep pending', onClick: close, disabled: isLoading },
        { key: 'reject', label: 'Reject application', kind: 'danger', loading: isLoading, onClick: () => form.submit() },
      ]}
    >
      <Form<RejectValues> form={form} layout="vertical" initialValues={{ reason: 'abn_not_verified' }} onFinish={submit}>
        <Form.Item label="Reason (shown to the applicant)" name="reason" rules={[{ required: true, message: 'Choose a reason' }]}>
          <Select options={REJECTION_REASONS.map(({ value, label }) => ({ value, label }))} />
        </Form.Item>
        <Form.Item
          label={reason === 'other' ? 'Additional detail' : 'Additional detail (optional)'}
          name="detail"
          rules={[
            { required: reason === 'other', whitespace: true, message: 'Tell the applicant why' },
            { max: REJECTION_DETAIL_MAX, message: `Detail can be at most ${REJECTION_DETAIL_MAX} characters` },
          ]}
        >
          <Input.TextArea rows={3} placeholder="Explain what needs fixing so they can resubmit..." />
        </Form.Item>
      </Form>
      <SADialogSection title="What changes">
        <SADialogPoints
          kind="remove"
          points={[
            { title: 'The applicant is emailed your reason.', detail: 'They see it as written, with your detail after it.' },
            { title: 'Their listings stay hidden from buyers.', detail: 'Nothing goes live until they are approved.' },
          ]}
        />
      </SADialogSection>
      <SADialogSection title="What stays the same">
        <SADialogPoints
          kind="keep"
          points={[{ title: 'They can update their details and resubmit at any time.', detail: 'A resubmitted application comes back to the queue.' }]}
        />
      </SADialogSection>
    </SADialog>
  )
}

export default RejectSupplierModal
