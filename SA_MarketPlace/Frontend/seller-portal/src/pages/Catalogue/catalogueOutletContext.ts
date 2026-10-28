import type { CatalogueListItem } from 'src/store/catalogue/types'

// What the catalogue page hands to its pop-up routes through <Outlet context>.
export interface CatalogueOutletContext {
  products: CatalogueListItem[]
}
