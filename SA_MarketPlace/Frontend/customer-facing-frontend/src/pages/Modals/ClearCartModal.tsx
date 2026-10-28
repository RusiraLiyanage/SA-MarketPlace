import { useOutletContext } from 'react-router'
import SADialog, { SADialogPoints, SADialogSection } from 'src/components/SADialog'
import { useRouteModal } from 'src/hooks/useRouteModal'
import type { CartOutletContext } from 'src/pages/Cart/cartOutletContext'
import { formatCurrency, pluralise } from 'src/utils/format'

// Opens over the cart; confirming empties it and closing returns to the cart (now showing it is empty).
const ClearCartModal = () => {
  const { items, onClear } = useOutletContext<CartOutletContext>()
  const { close } = useRouteModal()
  const total = items.reduce((sum, { lineTotal }) => sum + Number(lineTotal), 0)

  return (
    <SADialog
      tone="danger"
      title={items.length > 0 ? 'Clear your cart?' : 'Your cart is already empty'}
      summary={items.length > 0 ? `${pluralise(items.length, 'product')} · ${formatCurrency(total)}` : undefined}
      onCancel={close}
      actions={[
        { key: 'keep', label: 'Keep my cart', onClick: close },
        {
          key: 'clear',
          label: 'Clear cart',
          kind: 'danger',
          disabled: items.length === 0,
          onClick: () => {
            onClear()
            close()
          },
        },
      ]}
    >
      {items.length > 0 ? (
        <>
          <SADialogSection title="What changes">
            <SADialogPoints
              kind="remove"
              points={[
                { title: `All ${pluralise(items.length, 'product')} come out of your cart.`, detail: 'To order them you would add them again.' },
                { title: 'Your order total goes back to $0.00.' },
              ]}
            />
          </SADialogSection>
          <SADialogSection title="What stays the same">
            <SADialogPoints
              kind="keep"
              points={[
                { title: 'The products stay on the marketplace.', detail: 'Their prices and stock are not affected.' },
                { title: 'Your past orders are not affected.' },
              ]}
            />
          </SADialogSection>
        </>
      ) : (
        <SADialogSection title="Nothing to clear">
          <SADialogPoints kind="info" points={[{ title: 'There is nothing in your cart.', detail: 'Add products from the shop and they will show up here.' }]} />
        </SADialogSection>
      )}
    </SADialog>
  )
}

export default ClearCartModal
