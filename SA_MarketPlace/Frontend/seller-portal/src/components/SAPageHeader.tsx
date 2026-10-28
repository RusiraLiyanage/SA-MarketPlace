import { Flex, Typography } from 'antd'
import type { ReactNode } from 'react'
import styled from 'styled-components'
import SABreadcrumb from 'src/components/SABreadcrumb'
import { SAPageTitle } from 'src/components/SATitle'

interface Props {
  title: string
  subtitle?: string
  /** Buttons on the right, such as Add product or Save changes. */
  extra?: ReactNode
}

// The top of every signed-in page: the trail (from the second level), the title and the page's main actions.
const SAPageHeader = ({ title, subtitle, extra }: Props) => (
  <Header>
    <SABreadcrumb />
    <Flex justify="space-between" align="flex-start" gap="middle" wrap>
      <div>
        <Title>{title}</Title>
        {subtitle && <Typography.Text type="secondary">{subtitle}</Typography.Text>}
      </div>
      {extra}
    </Flex>
  </Header>
)

export default SAPageHeader

const Header = styled.header`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.marginXS}px;
`

const Title = styled(SAPageTitle)`
  && {
    margin: 0;
  }
`
