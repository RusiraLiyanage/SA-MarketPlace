import { Typography } from 'antd'
import styled from 'styled-components'

// Headings keep a real outline (one h1 per page, h2 for each section) while looking the way the designs draw them.

/** The page's one h1, drawn at the designs' page-title size. */
export const SAPageTitle = styled(Typography.Title).attrs({ level: 1 })`
  && {
    font-size: ${({ theme }) => theme.fontSizeHeading2}px;
    line-height: ${({ theme }) => theme.lineHeightHeading2};
  }
`

/** A card's or section's h2. `lg` is the larger heading used for sections that sit directly on the page. */
export const SASectionTitle = styled(Typography.Title).attrs({ level: 2 })<{ $size?: 'md' | 'lg' }>`
  && {
    font-size: ${({ $size, theme }) => ($size === 'lg' ? theme.fontSizeHeading3 : theme.fontSizeHeading4)}px;
    line-height: ${({ $size, theme }) => ($size === 'lg' ? theme.lineHeightHeading3 : theme.lineHeightHeading4)};
  }
`
