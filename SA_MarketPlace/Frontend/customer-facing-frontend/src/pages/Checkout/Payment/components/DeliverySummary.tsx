import { Button, Typography } from 'antd'
import styled from 'styled-components'
import type { DeliveryValues } from 'src/pages/Checkout/checkoutOutletContext'

interface Props {
  delivery: DeliveryValues
  organisationName: string
  onEdit: () => void
}

const DeliverySummary = ({ delivery, organisationName, onEdit }: Props) => (
  <Card aria-label="Delivering to">
    <div>
      <Label>Delivering to</Label>
      <Typography.Text>
        {`${organisationName} · ${delivery.streetAddress}, ${delivery.suburb} ${delivery.state} ${delivery.postcode}`}
      </Typography.Text>
    </div>
    <Button type="link" onClick={onEdit}>
      Edit
    </Button>
  </Card>
)

export default DeliverySummary

const Card = styled.section`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding: ${({ theme }) => theme.padding}px;
  background: ${({ theme }) => theme.colorBgContainer};
  border-radius: ${({ theme }) => theme.borderRadiusLG}px;
`

const Label = styled.div`
  margin-bottom: ${({ theme }) => theme.marginXXS}px;
  color: ${({ theme }) => theme.colorTextSecondary};
  font-size: ${({ theme }) => theme.fontSizeSM}px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
`
