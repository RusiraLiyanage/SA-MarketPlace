import { Typography } from 'antd'
import type { ReactNode } from 'react'
import styled from 'styled-components'

export type StatTone = 'primary' | 'success' | 'info'

interface Props {
  label: string
  value: number
  /** What the number counts: "orders", "products". */
  unit: string
  note: string
  icon: ReactNode
  tone: StatTone
  /** A seller with nothing yet: the card is drawn quietly. */
  muted?: boolean
}

// One of the three numbers across the top of the dashboard.
const StatCard = ({ label, value, unit, note, icon, tone, muted }: Props) => (
  <Card $muted={muted}>
    <Icon $tone={muted ? undefined : tone} aria-hidden>
      {icon}
    </Icon>
    <div>
      <Label>{label}</Label>
      <Figure>
        <Value $muted={muted}>{value}</Value> <Typography.Text type="secondary">{unit}</Typography.Text>
      </Figure>
      <Typography.Text type="secondary">{note}</Typography.Text>
    </div>
  </Card>
)

export default StatCard

const Card = styled.section<{ $muted?: boolean }>`
  display: flex;
  gap: ${({ theme }) => theme.margin}px;
  align-items: flex-start;
  padding: ${({ theme }) => theme.padding}px ${({ theme }) => theme.paddingLG}px;
  background: ${({ theme }) => theme.colorBgContainer};
  border-radius: ${({ theme }) => theme.borderRadiusLG}px;
`

const Icon = styled.span<{ $tone?: StatTone }>`
  display: grid;
  flex: none;
  place-items: center;
  width: 40px;
  height: 40px;
  background: ${({ $tone, theme }) =>
    $tone === 'success' ? theme.colorSuccessBg : $tone === 'info' ? theme.colorInfoBg : $tone ? theme.colorPrimaryBg : theme.colorFillQuaternary};
  border-radius: 50%;
  color: ${({ $tone, theme }) =>
    $tone === 'success' ? theme.colorSuccessText : $tone === 'info' ? theme.colorInfoText : $tone ? theme.colorPrimaryText : theme.colorTextDescription};
  font-size: 20px;
`

const Label = styled.div`
  color: ${({ theme }) => theme.colorTextDescription};
  font-size: ${({ theme }) => theme.fontSizeSM}px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
`

const Figure = styled.div`
  line-height: 1.2;
`

const Value = styled.span<{ $muted?: boolean }>`
  color: ${({ $muted, theme }) => ($muted ? theme.colorTextDescription : theme.colorText)};
  font-size: ${({ theme }) => theme.fontSizeHeading2}px;
  font-weight: 700;
`
