import { CheckOutlined, CloseOutlined, ExclamationOutlined, InfoOutlined } from '@ant-design/icons'
import { Button, Modal } from 'antd'
import type { ReactNode } from 'react'
import styled from 'styled-components'

export type DialogTone = 'danger' | 'warning' | 'info' | 'success'

export interface DialogAction {
  key: string
  label: string
  onClick: () => void
  /** Primary is the one to do, danger a destructive one, `danger-outline` a quieter destructive one, default the safe way out. */
  kind?: 'primary' | 'danger' | 'danger-outline' | 'default'
  loading?: boolean
  disabled?: boolean
}

interface Props {
  tone: DialogTone
  /** Replaces the tone's usual icon. */
  icon?: ReactNode
  title: string
  /** One short line under the title: what the dialog is about. */
  summary?: string
  children?: ReactNode
  /** Left to right; the safe choice first. They share the row equally. */
  actions: DialogAction[]
  /** Escape, a click outside, or the close button. */
  onCancel: () => void
  /** False when there is only one way on (an expired session): Escape and a click outside do nothing. */
  dismissible?: boolean
  width?: number
}

const TONE_ICON = {
  danger: <ExclamationOutlined />,
  warning: <ExclamationOutlined />,
  info: <InfoOutlined />,
  success: <CheckOutlined />,
} as const satisfies Record<DialogTone, ReactNode>

// Every pop-up in the portal: a coloured icon, a title with a one-line summary, then the body (sections, lists and notes
// below) and a row of equal buttons. The tone picks the colour, so a warning never looks like a confirmation.
const SADialog = ({ tone, icon, title, summary, children, actions, onCancel, dismissible = true, width = 520 }: Props) => (
  <Modal
    open
    width={width}
    closable={false}
    keyboard={dismissible}
    maskClosable={dismissible}
    onCancel={onCancel}
    title={
      <Heading>
        <Mark $tone={tone} aria-hidden>
          {icon ?? TONE_ICON[tone]}
        </Mark>
        <div>
          <Name>{title}</Name>
          {summary && <Summary>{summary}</Summary>}
        </div>
      </Heading>
    }
    footer={
      <Footer>
        {actions.map(({ key, label, onClick, kind = 'default', loading, disabled }) => (
          <Button
            key={key}
            type={kind === 'primary' || kind === 'danger' ? 'primary' : 'default'}
            danger={kind === 'danger' || kind === 'danger-outline'}
            loading={loading}
            disabled={disabled}
            onClick={onClick}
          >
            {label}
          </Button>
        ))}
      </Footer>
    }
  >
    {children}
  </Modal>
)

export default SADialog

/** A small-caps label above a list, such as "What changes". */
export const SADialogSection = ({ title, children }: { title: string; children: ReactNode }) => (
  <Section>
    <SectionLabel>{title}</SectionLabel>
    {children}
  </Section>
)

interface Point {
  title: string
  detail?: string
}

const POINT_ICON = { remove: <CloseOutlined />, keep: <CheckOutlined />, info: <InfoOutlined /> } as const

/** A list of points, each with a bold line and an optional lighter one. `remove` is a red cross, `keep` a green tick, `info` a blue "i". */
export const SADialogPoints = ({ kind, points }: { kind: keyof typeof POINT_ICON; points: Point[] }) => (
  <List>
    {points.map(({ title, detail }) => (
      <li key={title}>
        <Bullet $kind={kind} aria-hidden>
          {POINT_ICON[kind]}
        </Bullet>
        <div>
          <strong>{title}</strong>
          {detail && <span>{detail}</span>}
        </div>
      </li>
    ))}
  </List>
)

/** A tinted box for the one thing to read before pressing the button. */
export const SADialogNote = ({ tone, title, children }: { tone: DialogTone; title?: string; children?: ReactNode }) => (
  <Note $tone={tone} role="note">
    {title && <strong>{title}</strong>}
    {children && <span>{children}</span>}
  </Note>
)

const FILL = {
  danger: 'colorError',
  warning: 'colorWarningText',
  info: 'colorInfoText',
  success: 'colorSuccessText',
} as const satisfies Record<DialogTone, string>

const TINT = { danger: 'Error', warning: 'Warning', info: 'Info', success: 'Success' } as const satisfies Record<DialogTone, string>

const Heading = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.margin}px;
  font-size: ${({ theme }) => theme.fontSizeLG}px;
`

const Mark = styled.span<{ $tone: DialogTone }>`
  display: inline-flex;
  flex: none;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  color: ${({ theme }) => theme.colorTextLightSolid};
  background: ${({ $tone, theme }) => theme[FILL[$tone]]};
  border: 4px solid ${({ $tone, theme }) => theme[`color${TINT[$tone]}Bg`]};
  border-radius: 50%;
  box-sizing: content-box;
`

const Name = styled.h2`
  margin: 0;
  font-size: inherit;
  font-weight: inherit;
  line-height: inherit;
`

const Summary = styled.span`
  display: block;
  color: ${({ theme }) => theme.colorTextDescription};
  font-size: ${({ theme }) => theme.fontSizeSM}px;
  font-weight: 400;
`

const Footer = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.marginSM}px;
  margin-top: ${({ theme }) => theme.marginLG}px;

  .ant-btn {
    flex: 1;
    height: 44px;
    font-weight: 600;
  }
`

const Section = styled.section`
  margin-top: ${({ theme }) => theme.marginLG}px;

  &:first-child {
    margin-top: ${({ theme }) => theme.margin}px;
  }
`

const SectionLabel = styled.h3`
  margin: 0 0 ${({ theme }) => theme.marginSM}px;
  color: ${({ theme }) => theme.colorTextDescription};
  font-size: ${({ theme }) => theme.fontSizeSM}px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
`

const List = styled.ul`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.marginSM}px;
  margin: 0;
  padding: 0;
  list-style: none;

  li {
    display: flex;
    gap: ${({ theme }) => theme.marginSM}px;
  }

  li > div {
    display: flex;
    flex-direction: column;
  }

  li > div > span {
    color: ${({ theme }) => theme.colorTextSecondary};
    font-size: ${({ theme }) => theme.fontSizeSM}px;
  }
`

const BULLET = {
  remove: { color: 'colorErrorText', bg: 'colorErrorBg' },
  keep: { color: 'colorSuccessText', bg: 'colorSuccessBg' },
  info: { color: 'colorInfoText', bg: 'colorInfoBg' },
} as const

const Bullet = styled.span<{ $kind: keyof typeof BULLET }>`
  display: inline-flex;
  flex: none;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  margin-top: 1px;
  color: ${({ $kind, theme }) => theme[BULLET[$kind].color]};
  background: ${({ $kind, theme }) => theme[BULLET[$kind].bg]};
  border-radius: 50%;
  font-size: 10px;
`

const Note = styled.div<{ $tone: DialogTone }>`
  display: flex;
  flex-direction: column;
  margin-top: ${({ theme }) => theme.marginLG}px;
  padding: ${({ theme }) => theme.paddingSM}px ${({ theme }) => theme.padding}px;
  color: ${({ $tone, theme }) => theme[`color${TINT[$tone]}Text`]};
  background: ${({ $tone, theme }) => theme[`color${TINT[$tone]}Bg`]};
  border-radius: ${({ theme }) => theme.borderRadius}px;
  font-size: ${({ theme }) => theme.fontSizeSM}px;
`
