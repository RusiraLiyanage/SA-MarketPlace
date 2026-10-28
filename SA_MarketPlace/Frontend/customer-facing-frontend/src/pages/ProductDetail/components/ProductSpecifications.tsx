import styled from 'styled-components'
import SATable from 'src/components/SATable'
import type { ProductDetail } from 'src/types'
import { pluralise } from 'src/utils/format'
import { SASectionTitle } from 'src/components/SATitle'

interface Row {
  label: string
  detail: string
}

const brandAndManufacturer = ({ brand, manufacturer }: ProductDetail) =>
  [brand, manufacturer].filter((name, index, all) => name && all.indexOf(name) === index).join(' / ')

// Only the specifications the supplier filled in are listed.
const toRows = (product: ProductDetail): Row[] =>
  [
    { label: 'Category', detail: product.category.name },
    { label: 'SKU', detail: product.sku },
    { label: 'Pack Size', detail: product.packSize },
    { label: 'Brand / Manufacturer', detail: brandAndManufacturer(product) },
    { label: 'Certification', detail: product.certification },
    { label: 'Storage Conditions', detail: product.storageConditions },
    {
      label: 'Shelf Life',
      detail: product.shelfLifeMonths === null ? null : pluralise(product.shelfLifeMonths, 'month'),
    },
  ].filter((row): row is Row => Boolean(row.detail))

const ProductSpecifications = ({ product }: { product: ProductDetail }) => (
  <section>
    <Heading>Specifications</Heading>
    <SATable<Row>
      rowKey="label"
      dataSource={toRows(product)}
      columns={[
        { title: 'SPECIFICATION', dataIndex: 'label', width: '30%' },
        { title: 'DETAIL', dataIndex: 'detail' },
      ]}
    />
  </section>
)

export default ProductSpecifications

const Heading = styled(SASectionTitle)`
  && {
    margin-bottom: ${({ theme }) => theme.marginSM}px;
  }
`
