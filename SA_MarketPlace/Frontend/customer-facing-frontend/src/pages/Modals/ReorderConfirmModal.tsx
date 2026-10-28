import { App } from 'antd'
import { useNavigate, useParams } from 'react-router'
import SADialog, { SADialogNote, SADialogPoints, SADialogSection } from 'src/components/SADialog'
import SASkeleton from 'src/components/SASkeleton'
import { useRouteModal } from 'src/hooks/useRouteModal'
import { getErrorMessage, isApiError } from 'src/infra/errors'
import ReorderLines from 'src/pages/Modals/components/ReorderLines'
import { PATHS } from 'src/router/paths'
import { useGetOrderQuery, useReorderMutation } from 'src/store/orders/actions'
import { formatDate, pluralise } from 'src/utils/format'

// Opens over My Orders and over an order's page. Confirming adds the order's items back to the cart (nothing is
// ordered); the pop-up then says which lines went in and which could not be added, and why.
const ReorderConfirmModal = () => {
  const { orderNumber = '' } = useParams()
  const navigate = useNavigate()
  const { close } = useRouteModal()
  const { message } = App.useApp()
  // The same request the order page makes, so it is already cached there; from My orders it is fetched here.
  const { data: order, error, isLoading } = useGetOrderQuery(orderNumber)
  const [reorder, { data: result, isLoading: isReordering }] = useReorderMutation()

  if (result) {
    const added = result.lines.filter((line) => line.added).length
    const total = result.lines.length
    const none = added === 0
    const partly = !none && added < total

    return (
      <SADialog
        tone={none ? 'danger' : partly ? 'warning' : 'success'}
        width={560}
        title={
          none
            ? 'None of the items could be added'
            : partly
              ? `${added} of ${pluralise(total, 'item')} added to your cart`
              : `${pluralise(added, 'item')} added to your cart`
        }
        summary={none ? 'Your cart has not changed.' : 'Check the prices in your cart before you check out.'}
        onCancel={close}
        actions={[
          { key: 'close', label: 'Close', onClick: close },
          ...(none ? [] : [{ key: 'cart', label: 'Go to cart', kind: 'primary' as const, onClick: () => navigate(PATHS.cart) }]),
        ]}
      >
        <SADialogSection title={none ? 'Why they were not added' : 'What was added'}>
          <ReorderLines lines={result.lines} />
        </SADialogSection>
      </SADialog>
    )
  }

  const reorderNow = () => reorder(orderNumber).unwrap().catch((failure) => message.error(getErrorMessage(failure)))

  if (!isLoading && !order) {
    return (
      <SADialog
        tone="warning"
        title="We couldn’t find this order"
        onCancel={close}
        actions={[{ key: 'close', label: 'Close', kind: 'primary', onClick: close }]}
      >
        <SADialogNote tone="warning">
          {/* A missing order and one that belongs to someone else look the same (backend ADR 0025). */}
          {isApiError(error) && (error.status === 404 || error.status === 400)
            ? 'This order could not be found.'
            : getErrorMessage(error, 'This order could not be loaded.')}
        </SADialogNote>
      </SADialog>
    )
  }

  return (
    <SADialog
      tone="info"
      width={560}
      title={`Reorder ${orderNumber}?`}
      summary={order ? `${pluralise(order.items.length, 'item')} · placed ${formatDate(order.placedAt)}` : undefined}
      onCancel={close}
      actions={[
        { key: 'cancel', label: 'Not now', onClick: close, disabled: isReordering },
        { key: 'reorder', label: 'Add to cart', kind: 'primary', disabled: !order, loading: isReordering, onClick: reorderNow },
      ]}
    >
      {isLoading || !order ? (
        <SASkeleton rows={3} />
      ) : (
        <>
          <SADialogSection title="What happens">
            <SADialogPoints
              kind="info"
              points={[
                { title: 'Its items are added to your cart.', detail: 'Nothing is ordered or charged until you check out.' },
                { title: 'Prices are today’s prices.', detail: 'They may differ from the original order.' },
                { title: 'Anything unavailable is skipped.', detail: 'You will see which items, and why.' },
              ]}
            />
          </SADialogSection>
          <SADialogSection title="What stays the same">
            <SADialogPoints kind="keep" points={[{ title: 'The original order is not changed.', detail: 'Its status and invoice stay as they are.' }]} />
          </SADialogSection>
          <SADialogSection title="Items in this order">
            <ReorderLines lines={order.items.map(({ productName, quantity }) => ({ productName, requestedQuantity: quantity }))} />
          </SADialogSection>
        </>
      )}
    </SADialog>
  )
}

export default ReorderConfirmModal
