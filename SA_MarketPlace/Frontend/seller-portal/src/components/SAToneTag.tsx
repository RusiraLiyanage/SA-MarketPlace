import { Tag } from 'antd'
import type { ReactNode } from 'react'
import styled from 'styled-components'

export type Tone = 'default' | 'info' | 'success' | 'warning' | 'error'

// Which Ant Design token family each tone reads: colorInfoText, colorInfoBg and colorInfoBorder, and so on.
const FAMILY = { info: 'Info', success: 'Success', warning: 'Warning', error: 'Error' } as const

// Ant Design's preset tag colours (green on pale green and so on) are below 4.5:1, so the text uses the darker "Text"
// tokens from the theme while the tint and border keep the usual colours.
const SAToneTag = ({ tone, children }: { tone: Tone; children: ReactNode }) => (
  <Badge $tone={tone}>{children}</Badge>
)

export default SAToneTag

const Badge = styled(Tag)<{ $tone: Tone }>`
  ${({ $tone, theme }) => {
    if ($tone === 'default') return ''
    const family = FAMILY[$tone]
    return `
      color: ${theme[`color${family}Text`]};
      background: ${theme[`color${family}Bg`]};
      border-color: ${theme[`color${family}Border`]};
    `
  }}
`
