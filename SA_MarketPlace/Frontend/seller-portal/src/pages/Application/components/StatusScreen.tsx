import { CheckOutlined, CloseOutlined, ExclamationOutlined } from '@ant-design/icons'
import { Typography } from 'antd'
import type { ReactNode } from 'react'
import styled from 'styled-components'
import { SAPageTitle } from 'src/components/SATitle'

export type StatusTone = 'warning' | 'error' | 'success'

const ICONS = { warning: <ExclamationOutlined />, error: <CloseOutlined />, success: <CheckOutlined /> } as const

interface Props {
  tone: StatusTone
  title: string
  subtitle: string
  children?: ReactNode
}

// The look the three application screens share: a round icon in the status colour, the title, one line of explanation and
// whatever the screen adds under them. The icon only repeats what the title says, so it is hidden from screen readers.
const StatusScreen = ({ tone, title, subtitle, children }: Props) => (
  <Screen>
    <Badge $tone={tone} aria-hidden>
      {ICONS[tone]}
    </Badge>
    <SAPageTitle>{title}</SAPageTitle>
    <Typography.Text type="secondary">{subtitle}</Typography.Text>
    {children}
  </Screen>
)

export default StatusScreen

const Screen = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: ${({ theme }) => theme.marginSM}px;
  width: 100%;
  max-width: 640px;
  text-align: center;

  h1.ant-typography {
    margin: 0;
  }
`

// A solid circle inside a pale ring of the same colour.
const Badge = styled.span<{ $tone: StatusTone }>`
  display: grid;
  place-items: center;
  width: 52px;
  height: 52px;
  margin-bottom: ${({ theme }) => theme.marginXS}px;
  background: ${({ $tone, theme }) => ({ warning: theme.colorWarning, error: theme.colorError, success: theme.colorSuccess })[$tone]};
  border-radius: 50%;
  box-shadow: 0 0 0 14px
    ${({ $tone, theme }) => ({ warning: theme.colorWarningBg, error: theme.colorErrorBg, success: theme.colorSuccessBg })[$tone]};
  color: #fff;
  font-size: 26px;
`
