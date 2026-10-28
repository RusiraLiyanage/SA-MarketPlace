import { PlusOutlined } from '@ant-design/icons'
import { Button, Typography } from 'antd'
import { useNavigate } from 'react-router'
import styled from 'styled-components'
import { PATHS } from 'src/router/paths'

// For a verified seller with nothing yet: the one thing to do next.
const WelcomeBanner = ({ businessName }: { businessName: string }) => {
  const navigate = useNavigate()

  return (
    <Banner aria-label="Welcome">
      <div>
        <Title>Welcome to the marketplace, {businessName}</Title>
        <Typography.Text>You&apos;re verified and ready to sell — add your first product to get discovered by buyers.</Typography.Text>
      </div>
      <Button type="primary" size="large" icon={<PlusOutlined />} onClick={() => navigate(PATHS.newProduct)}>
        Add product
      </Button>
    </Banner>
  )
}

export default WelcomeBanner

const Banner = styled.section`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.margin}px;
  padding: ${({ theme }) => theme.padding}px ${({ theme }) => theme.paddingLG}px;
  background: ${({ theme }) => theme.colorPrimaryBg};
  border: 1px solid ${({ theme }) => theme.colorPrimaryBorder};
  border-radius: ${({ theme }) => theme.borderRadiusLG}px;
  color: ${({ theme }) => theme.colorPrimaryText};
`

const Title = styled.div`
  font-weight: 600;
`
