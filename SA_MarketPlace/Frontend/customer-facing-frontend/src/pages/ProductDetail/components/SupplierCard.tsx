import { Avatar, Typography } from 'antd'
import styled from 'styled-components'

const SupplierCard = ({ supplierName }: { supplierName: string }) => (
  <Card>
    <SupplierAvatar>{supplierName.charAt(0).toUpperCase()}</SupplierAvatar>
    <div>
      <Typography.Text strong>{supplierName}</Typography.Text>
      <div>
        <Typography.Text type="secondary">Verified marketplace supplier</Typography.Text>
      </div>
    </div>
  </Card>
)

export default SupplierCard

const Card = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.marginSM}px;
  padding: ${({ theme }) => theme.paddingSM}px ${({ theme }) => theme.padding}px;
  background: ${({ theme }) => theme.colorBgContainer};
  border-radius: ${({ theme }) => theme.borderRadiusLG}px;
`

const SupplierAvatar = styled(Avatar)`
  background: ${({ theme }) => theme.colorPrimaryBg};
  color: ${({ theme }) => theme.colorPrimaryText};
  font-weight: 600;
`
