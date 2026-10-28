import { App } from 'antd'
import { useNavigate, useOutletContext, useParams } from 'react-router'
import SADialog, { SADialogNote, SADialogPoints, SADialogSection } from 'src/components/SADialog'
import { useRouteModal } from 'src/hooks/useRouteModal'
import { getErrorMessage } from 'src/infra/errors'
import type { CatalogueOutletContext } from 'src/pages/Catalogue/catalogueOutletContext'
import { PATHS } from 'src/router/paths'
import { useGetProductQuery, useRetireProductMutation } from 'src/store/catalogue/actions'
import { LISTING_STATUS_DISPLAY } from 'src/store/catalogue/selector'

// Opens over the catalogue. Retiring is permanent (backend ADR 0035): the product is kept for history but leaves the shop,
// cannot be edited or published again, and keeps its SKU. Confirming goes to the Retired tab with a note saying so.
const RetireProductModal = () => {
  const { productId = '' } = useParams()
  const { products } = useOutletContext<CatalogueOutletContext>()
  const navigate = useNavigate()
  const { close } = useRouteModal()
  const { message } = App.useApp()
  const [retire, { isLoading }] = useRetireProductMutation()
  const product = products.find(({ id }) => id === productId)
  // The list rows do not carry the category; the product does, and the edit page reuses the same request.
  const category = useGetProductQuery(productId).data?.category.name

  const confirm = async () => {
    try {
      await retire(productId).unwrap()
      navigate(`${PATHS.catalogue}?status=retired`, { replace: true, state: { retired: product?.name ?? 'The product' } })
    } catch (error) {
      message.error(getErrorMessage(error))
    }
  }

  const summary = [product?.sku, category, product && `currently ${LISTING_STATUS_DISPLAY[product.listingStatus].label}`].filter(Boolean).join(' · ')

  return (
    <SADialog
      tone="danger"
      width={560}
      title={`Retire ${product?.name ?? 'this product'}?`}
      summary={summary || undefined}
      onCancel={close}
      actions={[
        { key: 'keep', label: 'Keep product', onClick: close },
        { key: 'retire', label: 'Retire product', kind: 'danger', loading: isLoading, onClick: confirm },
      ]}
    >
      <SADialogSection title="What changes">
        <SADialogPoints
          kind="remove"
          points={[
            { title: 'Buyers can no longer find or buy it.', detail: 'It is removed from the marketplace and from Collection Manager.' },
            { title: 'Carts holding it say “This product is no longer available”.', detail: 'It can no longer be ordered.' },
            {
              title: 'You cannot edit it, publish it again or reuse its SKU.',
              detail: `SKU ${product?.sku ?? 'of this product'} stays reserved so your records stay accurate.`,
            },
          ]}
        />
      </SADialogSection>
      <SADialogSection title="What stays the same">
        <SADialogPoints
          kind="keep"
          points={[
            { title: 'Orders already placed are not affected.', detail: 'You still dispatch, cancel and download invoices as normal.' },
            { title: 'It stays in your catalogue under Retired,', detail: 'read-only, so past orders still make sense.' },
          ]}
        />
      </SADialogSection>
      <SADialogNote tone="danger" title="This cannot be undone.">
        To sell it again you would add it as a new product, with a different SKU.
      </SADialogNote>
    </SADialog>
  )
}

export default RetireProductModal
