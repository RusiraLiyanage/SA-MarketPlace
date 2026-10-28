import { Flex, Typography } from 'antd'
import type { ReactNode } from 'react'
import styled from 'styled-components'
import type { CartSummary } from 'src/types'
import { formatCurrency, pluralise } from 'src/utils/format'
import { SASectionTitle } from 'src/components/SATitle'

interface Line {
  name: string
  quantity: number
  lineTotal: string
}

interface Props {
  summary: CartSummary
  /** The items being ordered; checkout lists them, the cart does not. */
  lines?: Line[]
  /** The buttons (and anything above them) at the foot of the card. */
  children?: ReactNode
}

// Used by the cart and by both checkout steps. Prices already include GST, so the GST line is the part inside the total.
const OrderSummaryCard = ({ summary, lines, children }: Props) => (
  <Card aria-label="Order summary">
    <SASectionTitle>Order summary</SASectionTitle>
    {lines && (
      <Rows>
        {lines.map(({ name, quantity, lineTotal }) => (
          <Row key={name}>
            <span>
              {name} x{quantity}
            </span>
            <span>{formatCurrency(lineTotal)}</span>
          </Row>
        ))}
      </Rows>
    )}
    <Rows $divided={Boolean(lines)}>
      <Row>
        <span>{lines ? 'Subtotal' : `Subtotal (${pluralise(summary.itemCount, 'item')})`}</span>
        <span>{formatCurrency(summary.total)}</span>
      </Row>
      <Row>
        <span>GST (incl.)</span>
        <span>{formatCurrency(summary.gstIncluded)}</span>
      </Row>
      <Row>
        <span>Delivery</span>
        <Free>Free</Free>
      </Row>
    </Rows>
    <TotalRow justify="space-between" align="center">
      <Typography.Text strong>Total</Typography.Text>
      <Total>{formatCurrency(summary.total)}</Total>
    </TotalRow>
    {children && <Actions>{children}</Actions>}
  </Card>
)

export default OrderSummaryCard

const Card = styled.section`
  padding: ${({ theme }) => theme.padding}px;
  background: ${({ theme }) => theme.colorBgContainer};
  border-radius: ${({ theme }) => theme.borderRadiusLG}px;
`

const Rows = styled.div<{ $divided?: boolean }>`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.marginXS}px;
  margin-bottom: ${({ theme }) => theme.margin}px;
  ${({ $divided, theme }) => $divided && `padding-top: ${theme.padding}px; border-top: 1px solid ${theme.colorBorderSecondary};`}
`

const Row = styled.div`
  display: flex;
  justify-content: space-between;
  gap: ${({ theme }) => theme.margin}px;
  color: ${({ theme }) => theme.colorTextSecondary};
`

const Free = styled.span`
  color: ${({ theme }) => theme.colorSuccessText};
`

const TotalRow = styled(Flex)`
  padding-top: ${({ theme }) => theme.padding}px;
  border-top: 1px solid ${({ theme }) => theme.colorBorderSecondary};
`

const Total = styled.span`
  font-size: ${({ theme }) => theme.fontSizeHeading3}px;
  font-weight: 700;
`

const Actions = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.marginXS}px;
  margin-top: ${({ theme }) => theme.margin}px;
`
