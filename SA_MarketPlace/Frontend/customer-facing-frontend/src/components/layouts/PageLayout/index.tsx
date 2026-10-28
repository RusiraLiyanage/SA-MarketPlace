import { Flex, Typography } from 'antd'
import type { ReactNode } from 'react'
import styled from 'styled-components'
import { SAPageTitle } from 'src/components/SATitle'

interface Props {
  title: string
  subtitle?: string
  extra?: ReactNode
  children: ReactNode
}

// The padded page area with a title block, shared by Cart, Checkout, My Orders, Order detail and Profile.
const PageLayout = ({ title, subtitle, extra, children }: Props) => (
  <Page>
    <Flex justify="space-between" align="center" gap="middle">
      <div>
        <Title>{title}</Title>
        {subtitle && <Typography.Text type="secondary">{subtitle}</Typography.Text>}
      </div>
      {extra}
    </Flex>
    {children}
  </Page>
)

export default PageLayout

const Page = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.marginLG}px;
  padding: ${({ theme }) => theme.paddingLG}px;
`

const Title = styled(SAPageTitle)`
  && {
    margin: 0;
  }
`
