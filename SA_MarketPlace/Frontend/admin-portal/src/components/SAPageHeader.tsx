import { Flex, Typography } from 'antd'
import type { ReactNode } from 'react'
import styled from 'styled-components'
import SABreadcrumb from 'src/components/SABreadcrumb'
import { SAPageTitle } from 'src/components/SATitle'

interface Props {
  title: string
  subtitle?: string
  /** Beside the title, such as a status tag. */
  tag?: ReactNode
  /** Buttons on the right, such as Export CSV or Approve. */
  extra?: ReactNode
}

// The top of every signed-in page: the trail (from the second level), the title and the page's main actions.
const SAPageHeader = ({ title, subtitle, tag, extra }: Props) => (
  <Header>
    <SABreadcrumb />
    <Flex justify="space-between" align="flex-start" gap="middle" wrap>
      <div>
        <Heading>
          <Title>{title}</Title>
          {tag}
        </Heading>
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

const Heading = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: ${({ theme }) => theme.marginSM}px;
`

const Title = styled(SAPageTitle)`
  && {
    margin: 0;
  }
`
