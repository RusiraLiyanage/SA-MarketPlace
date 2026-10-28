import { App, Form, Input, Select } from 'antd'
import { useParams } from 'react-router'
import SADialog, { SADialogNote, SADialogPoints, SADialogSection } from 'src/components/SADialog'
import { CANCEL_NOTES_MAX, CANCEL_REASONS } from 'src/constants'
import { useRouteModal } from 'src/hooks/useRouteModal'
import { getErrorMessage } from 'src/infra/errors'
import { useCancelOrderMutation, useGetOrderQuery } from 'src/store/orders/actions'
import type { CancelReason } from 'src/store/orders/types'
import { formatDate, pluralise } from 'src/utils/format'

interface CancelValues {
  reason: CancelReason
  notes?: string
}

// Opens over the order ("Cannot fulfil this order"). The backend marks the order cancelled, puts the units back on the
// products and marks a paid payment refunded in one go, then emails the buyer (no money actually moves in Phase 1).
const CancelOrderModal = () => {
  const { orderNumber = '' } = useParams()
  const { close } = useRouteModal()
  const { message } = App.useApp()
  const { data: order } = useGetOrderQuery(orderNumber)
  const [cancelOrder, { isLoading }] = useCancelOrderMutation()
  const [form] = Form.useForm<CancelValues>()
  const reason = Form.useWatch('reason', form)

  const submit = async ({ reason, notes }: CancelValues) => {
    try {
      await cancelOrder({ orderNumber, reason, notes: notes?.trim() || undefined }).unwrap()
      message.success('Order cancelled')
      close()
    } catch (error) {
      message.error(getErrorMessage(error))
    }
  }

  const summary = order
    ? [order.organisationName ?? 'Buyer', pluralise(order.items.length, 'item'), `placed ${formatDate(order.placedAt)}`].join(' · ')
    : undefined

  return (
    <SADialog
      tone="danger"
      width={560}
      title={`Cancel order ${orderNumber}?`}
      summary={summary}
      onCancel={close}
      actions={[
        { key: 'keep', label: 'Keep order', onClick: close },
        {
          key: 'cancel',
          label: 'Cancel order',
          kind: 'danger',
          loading: isLoading,
          disabled: order !== undefined && !order.canDispatch,
          onClick: () => form.submit(),
        },
      ]}
    >
      <Form<CancelValues> form={form} layout="vertical" initialValues={{ reason: 'out_of_stock' }} onFinish={submit}>
        <Form.Item label="Reason for cancellation" name="reason" rules={[{ required: true, message: 'Choose a reason' }]}>
          <Select options={CANCEL_REASONS.map(({ value, label }) => ({ value, label }))} />
        </Form.Item>
        <Form.Item
          label={reason === 'other' ? 'Notes' : 'Additional notes (optional)'}
          name="notes"
          rules={[
            { required: reason === 'other', whitespace: true, message: 'Tell the buyer why' },
            { max: CANCEL_NOTES_MAX, message: `Notes can be at most ${CANCEL_NOTES_MAX} characters` },
          ]}
        >
          <Input.TextArea rows={3} placeholder="Add any extra context for the buyer or admin..." />
        </Form.Item>
      </Form>
      <SADialogSection title="What changes">
        <SADialogPoints
          kind="remove"
          points={[
            { title: 'The order is cancelled.', detail: 'It leaves your dispatch queue and can no longer be dispatched.' },
            { title: `${order?.organisationName ?? 'The buyer'} is emailed.`, detail: 'The email includes your reason and notes.' },
            { title: 'The payment is marked refunded.', detail: 'Payments are simulated for now, so no money moves.' },
          ]}
        />
      </SADialogSection>
      <SADialogSection title="What stays the same">
        <SADialogPoints
          kind="keep"
          points={[
            { title: 'The units go back into your stock.', detail: 'Only this order’s units return; your listings are not changed.' },
            { title: 'Your other orders are not affected.' },
          ]}
        />
      </SADialogSection>
      <SADialogNote tone="danger" title="This cannot be undone.">
        A cancelled order cannot be reopened. The buyer would have to place a new one.
      </SADialogNote>
    </SADialog>
  )
}

export default CancelOrderModal
