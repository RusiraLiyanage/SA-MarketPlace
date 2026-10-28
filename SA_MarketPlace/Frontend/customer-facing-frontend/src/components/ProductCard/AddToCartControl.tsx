import { Button } from 'antd'
import SAQuantityStepper from 'src/components/SAQuantityStepper'
import { usePending } from 'src/hooks/usePending'
import type { StockStatus } from 'src/types'

interface Props {
  stockStatus: StockStatus
  /** How many are in the cart; 0 means none. */
  quantity: number
  /** May return a promise: the button shows a spinner until it settles. */
  onQuantityChange: (quantity: number) => unknown
  /** A quieter Add to cart button, for the cards under "You may also like". */
  compact?: boolean
}

// A plain button until the item is really in the cart, then the stepper; reducing to 0 brings the button back. Out of stock
// shows a disabled button: back-in-stock alerts are not built, so nothing here promises one.
const AddToCartControl = ({ stockStatus, quantity, onQuantityChange, compact }: Props) => {
  const { pending, run } = usePending()

  if (stockStatus === 'out_of_stock') {
    return (
      <Button block disabled>
        Out of stock
      </Button>
    )
  }

  if (quantity > 0) {
    return <SAQuantityStepper block value={quantity} onChange={onQuantityChange} />
  }

  return (
    <Button type={compact ? 'default' : 'primary'} block loading={pending} onClick={() => run(() => onQuantityChange(1))}>
      Add to cart
    </Button>
  )
}

export default AddToCartControl
