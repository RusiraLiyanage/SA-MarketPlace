import { Table, Typography } from 'antd'
import styled from 'styled-components'
import SATable from 'src/components/SATable'
import type { OrderDetail, OrderDetailItem } from 'src/types'
import { formatCurrency } from 'src/utils/format'
import { SASectionTitle } from 'src/components/SATitle'

type Props = Pick<OrderDetail, 'items' | 'subtotal' | 'gstTotal' | 'total'>

// Prices are the ones frozen when the order was placed. Unit prices include GST, so the lines add up to the total;
// the subtotal and GST rows split that total the way the tax invoice does.
const OrderItemsTable = ({ items, subtotal, gstTotal, total }: Props) => (
  <Card aria-label="Items ordered">
    <SASectionTitle>Items ordered</SASectionTitle>
    <SATable<OrderDetailItem>
      rowKey="productId"
      dataSource={items}
      columns={[
        {
          title: 'PRODUCT',
          render: (_, { productName, sku }) => (
            <div>
              <div>{productName}</div>
              <Typography.Text type="secondary">SKU: {sku}</Typography.Text>
            </div>
          ),
        },
        { title: 'QTY', dataIndex: 'quantity', align: 'center' },
        {
          title: 'UNIT PRICE',
          dataIndex: 'unitPrice',
          align: 'right',
          render: (price: string) => formatCurrency(price),
        },
        {
          title: 'TOTAL',
          dataIndex: 'lineTotal',
          align: 'right',
          render: (lineTotal: string) => <Typography.Text strong>{formatCurrency(lineTotal)}</Typography.Text>,
        },
      ]}
      summary={() => (
        <Table.Summary>
          <Table.Summary.Row>
            <Table.Summary.Cell index={0} colSpan={3} align="right">
              Subtotal (excl. GST)
            </Table.Summary.Cell>
            <Table.Summary.Cell index={1} align="right">
              {formatCurrency(subtotal)}
            </Table.Summary.Cell>
          </Table.Summary.Row>
          <Table.Summary.Row>
            <Table.Summary.Cell index={0} colSpan={3} align="right">
              GST
            </Table.Summary.Cell>
            <Table.Summary.Cell index={1} align="right">
              {formatCurrency(gstTotal)}
            </Table.Summary.Cell>
          </Table.Summary.Row>
          <Table.Summary.Row>
            <Table.Summary.Cell index={0} colSpan={3} align="right">
              <Typography.Text strong>Total</Typography.Text>
            </Table.Summary.Cell>
            <Table.Summary.Cell index={1} align="right">
              <Total>{formatCurrency(total)}</Total>
            </Table.Summary.Cell>
          </Table.Summary.Row>
        </Table.Summary>
      )}
    />
  </Card>
)

export default OrderItemsTable

const Card = styled.section`
  padding: ${({ theme }) => theme.padding}px;
  background: ${({ theme }) => theme.colorBgContainer};
  border-radius: ${({ theme }) => theme.borderRadiusLG}px;
`

const Total = styled.span`
  font-size: ${({ theme }) => theme.fontSizeHeading4}px;
  font-weight: 700;
`
