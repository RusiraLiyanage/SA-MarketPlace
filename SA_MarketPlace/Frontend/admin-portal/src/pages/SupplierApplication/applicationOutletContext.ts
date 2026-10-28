import type { SupplierApplicationDetail } from 'src/store/suppliers/types'

// What the application page hands to its approve and reject pop-ups through <Outlet context>.
export interface ApplicationOutletContext {
  application: SupplierApplicationDetail
}
