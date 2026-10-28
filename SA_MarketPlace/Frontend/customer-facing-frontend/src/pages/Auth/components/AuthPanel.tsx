import { Typography } from 'antd'
import type { ReactNode } from 'react'
import styled from 'styled-components'
import { SAPageTitle } from 'src/components/SATitle'

interface Props {
  title: string
  subtitle?: string
  /** Register is wider than the other auth cards. */
  wide?: boolean
  children: ReactNode
}

// The heading above a white card that every auth page shares.
const AuthPanel = ({ title, subtitle, wide, children }: Props) => (
  <Panel $wide={wide}>
    <Heading>
      <SAPageTitle>{title}</SAPageTitle>
      {subtitle && <Typography.Text type="secondary">{subtitle}</Typography.Text>}
    </Heading>
    <Card>{children}</Card>
  </Panel>
)

export default AuthPanel

const Panel = styled.div<{ $wide?: boolean }>`
  width: 100%;
  max-width: ${({ $wide }) => ($wide ? 560 : 440)}px;
`

const Heading = styled.div`
  margin-bottom: ${({ theme }) => theme.marginLG}px;
  text-align: center;

  h2.ant-typography {
    margin-bottom: ${({ theme }) => theme.marginXXS}px;
  }
`

const Card = styled.div`
  padding: ${({ theme }) => theme.paddingLG}px;
  background: ${({ theme }) => theme.colorBgContainer};
  border-radius: ${({ theme }) => theme.borderRadiusLG}px;
`
