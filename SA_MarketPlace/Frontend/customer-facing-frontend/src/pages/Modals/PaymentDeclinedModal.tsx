import { CloseOutlined } from '@ant-design/icons'
import SADialog, { SADialogNote, SADialogPoints, SADialogSection } from 'src/components/SADialog'
import { useRouteModal } from 'src/hooks/useRouteModal'

// Opens over the payment step when the card is refused; closing returns to the form to try another card. Checkout is one
// transaction (backend ADR 0023), so a declined card leaves no order, no stock change and the cart as it was.
const PaymentDeclinedModal = () => {
  const { close } = useRouteModal()

  return (
    <SADialog
      tone="danger"
      icon={<CloseOutlined />}
      title="Your card was declined"
      summary="Your order has not been placed."
      onCancel={close}
      actions={[{ key: 'retry', label: 'Try another card', kind: 'primary', onClick: close }]}
    >
      <SADialogSection title="What happened">
        <SADialogPoints
          kind="info"
          points={[
            { title: 'No payment was taken.', detail: 'You have not been charged.' },
            { title: 'No order was placed.', detail: 'Nothing was reserved or sent to the supplier.' },
          ]}
        />
      </SADialogSection>
      <SADialogSection title="What stays the same">
        <SADialogPoints
          kind="keep"
          points={[
            { title: 'Your cart is kept.', detail: 'Every item is still in it.' },
            { title: 'Your delivery details are kept.', detail: 'You do not need to enter them again.' },
          ]}
        />
      </SADialogSection>
      <SADialogNote tone="info" title="What to do next">
        Check the card number and expiry date, or use a different card.
      </SADialogNote>
    </SADialog>
  )
}

export default PaymentDeclinedModal
