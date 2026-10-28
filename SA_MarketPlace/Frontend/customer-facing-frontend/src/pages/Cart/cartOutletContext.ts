import type { CartItem } from 'src/types'

// What the cart page hands to its pop-up routes through <Outlet context>.
export interface CartOutletContext {
  items: CartItem[]
  onRemove: (productId: string) => void
  onClear: () => void
}
