import { Typography } from 'antd'
import type { ReactNode } from 'react'
import styled from 'styled-components'
import { SAPageTitle } from 'src/components/SATitle'

interface Props {
  title: string
  subtitle?: string
  /** Register is wider than the other auth cards. */
  wide?: boolean
  /** Shown above the title, such as the envelope on the forgot-password page. */
  icon?: ReactNode
  children: ReactNode
}

// The heading above a white card that every auth page shares.
const AuthPanel = ({ title, subtitle, wide, icon, children }: Props) => (
  <Panel $wide={wide}>
    <Heading>
      {icon}
      <SAPageTitle>{title}</SAPageTitle>
      {subtitle && <Typography.Text type="secondary">{subtitle}</Typography.Text>}
    </Heading>
    {children}
  </Panel>
)

export default AuthPanel

const Panel = styled.div<{ $wide?: boolean }>`
  width: 100%;
  max-width: ${({ $wide }) => ($wide ? 720 : 440)}px;
`

const Heading = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: ${({ theme }) => theme.marginLG}px;
  text-align: center;

  h1.ant-typography {
    margin-bottom: ${({ theme }) => theme.marginXXS}px;
  }

  .anticon {
    margin-bottom: ${({ theme }) => theme.marginXS}px;
    color: ${({ theme }) => theme.colorPrimaryText};
    font-size: 32px;
  }
`
