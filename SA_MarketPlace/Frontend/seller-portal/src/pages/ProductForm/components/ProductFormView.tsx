import { Alert, App, Button, Col, Flex, Form, Input, InputNumber, Row, Typography } from 'antd'
import { useState } from 'react'
import { useNavigate } from 'react-router'
import styled from 'styled-components'
import SAFormItem from 'src/components/SAFormItem'
import SAPageHeader from 'src/components/SAPageHeader'
import UnsavedChangesDialog from 'src/components/UnsavedChangesDialog'
import { useUnsavedChanges } from 'src/hooks/useUnsavedChanges'
import { ERROR_CODE, getErrorMessage, isApiError } from 'src/infra/errors'
import CategoryFields from 'src/pages/ProductForm/components/CategoryFields'
import SACard from 'src/components/SACard'
import ListingStatusCard from 'src/pages/ProductForm/components/ListingStatusCard'
import ProductImages from 'src/pages/ProductForm/components/ProductImages'
import {
  MAX_IMAGES,
  hasUnsavedProductChanges,
  productChanges,
  productFields,
  productFormData,
  publishLabel,
  toFormValues,
  type ProductFormValues,
} from 'src/pages/ProductForm/productForm'
import { useProductImages } from 'src/pages/ProductForm/useProductImages'
import { usePageCrumbs } from 'src/router/pageMeta'
import { PATHS } from 'src/router/paths'
import { useCreateProductMutation, useEditProductMutation } from 'src/store/catalogue/actions'
import { priceProblem } from 'src/store/catalogue/selector'
import { ListingStatus, type CategoryTreeItem, type ProductEdit } from 'src/store/catalogue/types'
import { requiredMarkAfter } from 'src/utils/requiredMark'

interface Props {
  /** Absent when adding a product. */
  product?: ProductEdit
  categories: CategoryTreeItem[]
}

type Choice = typeof ListingStatus.draft | typeof ListingStatus.published

// What saving did, in the seller's terms.
const doneMessage = (choice: Choice, before?: ListingStatus): string => {
  if (choice === ListingStatus.published) return before === ListingStatus.published ? 'Changes saved' : 'Product published. It is now visible to buyers.'
  return before === ListingStatus.published ? 'Saved as a draft. It is no longer visible to buyers.' : 'Draft saved'
}

// Add product and Edit product. Save draft and Publish are the two ways to save, and they set the listing status; everything
// else the form sends is what changed (backend ADR 0035), so editing a name never overwrites stock that has sold since.
const ProductFormView = ({ product, categories }: Props) => {
  const navigate = useNavigate()
  const { message } = App.useApp()
  const [form] = Form.useForm<ProductFormValues>()
  const images = useProductImages(product?.images ?? [])
  const [create] = useCreateProductMutation()
  const [edit] = useEditProductMutation()
  const [saving, setSaving] = useState<Choice>()
  const retired = product?.listingStatus === ListingStatus.retired
  const title = retired ? 'View product' : product ? 'Edit product' : 'Add product'
  // The route's own trail says "Edit product"; a retired product is only viewed, so the page names itself.
  usePageCrumbs([{ title: 'Catalogue', to: PATHS.catalogue }, { title }])
  const values = Form.useWatch([], form)
  const { blocker, allowLeave } = useUnsavedChanges(!retired && hasUnsavedProductChanges(product, values ?? toFormValues(product), images.changed))

  // Saves the form; true when it worked. `goToCatalogue` is false when the unsaved-changes prompt saves on the way somewhere else.
  const save = async (choice: Choice, goToCatalogue = true): Promise<boolean> => {
    let values: ProductFormValues
    try {
      values = await form.validateFields()
    } catch {
      return false
    }
    if (choice === ListingStatus.published && !values.description.trim()) {
      form.setFields([{ name: 'description', errors: ['A description is required to publish'] }])
      return false
    }

    const newImages = images.added.map(({ file }) => file)
    let body: FormData
    if (product) {
      const changes = productChanges(product, values)
      const listingStatus = choice !== product.listingStatus ? choice : undefined
      if (Object.keys(changes).length === 0 && !listingStatus && !images.changed) {
        message.info('There are no changes to save')
        return false
      }
      body = productFormData({ fields: changes, listingStatus, newImages, removeImageIds: images.removedIds })
    } else {
      body = productFormData({ fields: productFields(values), listingStatus: choice, newImages })
    }

    setSaving(choice)
    try {
      await (product ? edit({ productId: product.id, body }) : create(body)).unwrap()
      message.success(doneMessage(choice, product?.listingStatus))
      if (goToCatalogue) {
        allowLeave()
        navigate(PATHS.catalogue)
      }
      return true
    } catch (error) {
      // A SKU belongs to one product of a seller's, so a clash is about that box, not the whole form.
      if (isApiError(error) && error.code === ERROR_CODE.conflict && /sku/i.test(error.message)) {
        form.setFields([{ name: 'sku', errors: [error.message] }])
      } else {
        message.error(getErrorMessage(error))
      }
      return false
    } finally {
      setSaving(undefined)
    }
  }

  // The prompt saves as the product already is (a draft stays a draft, a published product stays published); a new product is saved as a draft.
  const saveBeforeLeaving = () => save(product?.listingStatus === ListingStatus.published ? ListingStatus.published : ListingStatus.draft, false)

  return (
    <>
      <Form<ProductFormValues>
        form={form}
        layout="vertical"
        requiredMark={requiredMarkAfter}
        disabled={retired}
        initialValues={toFormValues(product)}
      >
        <Page>
          <SAPageHeader
            title={title}
            extra={
              !retired && (
                <Flex gap="small">
                  <Button size="large" loading={saving === ListingStatus.draft} disabled={saving !== undefined} onClick={() => save(ListingStatus.draft)}>
                    Save draft
                  </Button>
                  <Button
                    type="primary"
                    size="large"
                    loading={saving === ListingStatus.published}
                    disabled={saving !== undefined}
                    onClick={() => save(ListingStatus.published)}
                  >
                    {publishLabel(product?.listingStatus)}
                  </Button>
                </Flex>
              )
            }
          />
          {retired && <Alert showIcon type="info" title="This product is retired" description="It is read-only: it cannot be edited or published again, and its SKU stays reserved." />}
          <Columns>
            <Left>
              <SACard title="Basic details">
                <Form.Item label="Product name" name="name" rules={[{ required: true, whitespace: true, message: 'Enter the product name' }, { max: 255, message: 'Name is too long' }]}>
                  <Input placeholder="e.g. Hair Follicle Test Kit" />
                </Form.Item>
                <Form.Item
                  label="Description"
                  name="description"
                  extra={retired ? undefined : 'Required to publish.'}
                  rules={[{ max: 5000, message: 'Description is too long' }]}
                >
                  <Input.TextArea rows={4} placeholder="Describe what is included and what the product is used for." />
                </Form.Item>
                <CategoryFields form={form} categories={categories} />
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item label="SKU" name="sku" rules={[{ required: true, whitespace: true, message: 'Enter a SKU' }, { max: 64, message: 'SKU is too long' }]}>
                      <Input placeholder="e.g. HFT-003" />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item label="Pack size" name="packSize" rules={[{ max: 60, message: 'Pack size is too long' }]}>
                      <Input placeholder="e.g. 1 unit" />
                    </Form.Item>
                  </Col>
                </Row>
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item label="Brand" name="brand" rules={[{ max: 120, message: 'Brand is too long' }]}>
                      <Input placeholder="e.g. Bindi MedSupply" />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item label="Manufacturer" name="manufacturer" rules={[{ max: 120, message: 'Manufacturer is too long' }]}>
                      <Input placeholder="e.g. Acme Diagnostics" />
                    </Form.Item>
                  </Col>
                </Row>
                <Form.Item label="Certification" name="certification" rules={[{ max: 255, message: 'Certification is too long' }]}>
                  <Input placeholder="e.g. TGA listed" />
                </Form.Item>
              </SACard>

              <SACard title="Product images">
                <ProductImages images={images} readOnly={retired} />
                <Typography.Paragraph type="secondary">
                  Add up to {MAX_IMAGES} images (JPEG, PNG or WebP, 5 MB each). The first is the main image shown to buyers.
                </Typography.Paragraph>
              </SACard>
            </Left>

            <Right>
              <SACard title="Pricing & stock">
                <SAFormItem
                  label="Price (GST inclusive)"
                  name="price"
                  extra="You set and control this price directly — there is no Sample Assist confirmation step."
                  rules={[
                    { required: true, message: 'Enter a price' },
                    { validator: (_rule, value: string | undefined) => (!value || !priceProblem(value) ? Promise.resolve() : Promise.reject(new Error(priceProblem(value)!))) },
                  ]}
                >
                  <Input prefix="$" placeholder="0.00" inputMode="decimal" />
                </SAFormItem>
                <Form.Item label="Stock quantity" name="quantity" rules={[{ required: true, message: 'Enter the stock on hand' }]}>
                  <InputNumber min={0} precision={0} style={{ width: '100%' }} />
                </Form.Item>
                <Form.Item label="Low stock threshold" name="lowStockThreshold" extra="You are warned when published stock falls to this number.">
                  <InputNumber min={0} precision={0} style={{ width: '100%' }} />
                </Form.Item>
              </SACard>
              <ListingStatusCard status={product?.listingStatus} />
            </Right>
          </Columns>
        </Page>
      </Form>
      <UnsavedChangesDialog blocker={blocker} onSave={saveBeforeLeaving} saveLabel={product ? 'Save changes' : 'Save as draft'} />
    </>
  )
}

export default ProductFormView

const Page = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.marginLG}px;
`

const Columns = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) 340px;
  gap: ${({ theme }) => theme.margin}px;
  align-items: start;
`

const Left = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.margin}px;
`

const Right = styled(Left)``
