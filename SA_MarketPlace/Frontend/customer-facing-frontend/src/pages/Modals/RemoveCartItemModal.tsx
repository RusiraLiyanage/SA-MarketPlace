import { useParams, useOutletContext } from 'react-router'
import SADialog, { SADialogPoints, SADialogSection } from 'src/components/SADialog'
import { useRouteModal } from 'src/hooks/useRouteModal'
import type { CartOutletContext } from 'src/pages/Cart/cartOutletContext'
import { formatCurrency } from 'src/utils/format'

// Opens over the cart; confirming removes the line and closing returns to the cart.
const RemoveCartItemModal = () => {
  const { productId } = useParams()
  const { items, onRemove } = useOutletContext<CartOutletContext>()
  const { close } = useRouteModal()
  const item = items.find((line) => line.productId === productId)

  return (
    <SADialog
      tone="danger"
      title={item ? `Remove ${item.name}?` : 'This item is no longer in your cart'}
      summary={item ? `${item.quantity} × ${formatCurrency(item.price)} · ${formatCurrency(item.lineTotal)}` : undefined}
      onCancel={close}
      actions={[
        { key: 'keep', label: 'Keep item', onClick: close },
        {
          key: 'remove',
          label: 'Remove item',
          kind: 'danger',
          disabled: !item,
          onClick: () => {
            if (item) onRemove(item.productId)
            close()
          },
        },
      ]}
    >
      {item ? (
        <>
          <SADialogSection title="What changes">
            <SADialogPoints
              kind="remove"
              points={[
                { title: 'It comes out of your cart.', detail: `Your order total goes down by ${formatCurrency(item.lineTotal)}.` },
              ]}
            />
          </SADialogSection>
          <SADialogSection title="What stays the same">
            <SADialogPoints
              kind="keep"
              points={[
                { title: 'The rest of your cart is unchanged.' },
                { title: 'You can add it again at any time.', detail: 'As long as it is in stock.' },
              ]}
            />
          </SADialogSection>
        </>
      ) : (
        <SADialogSection title="Nothing to remove">
          <SADialogPoints kind="info" points={[{ title: 'It may already have been removed.', detail: 'Go back to your cart to see what is in it now.' }]} />
        </SADialogSection>
      )}
    </SADialog>
  )
}

export default RemoveCartItemModal
