import type { ReactNode } from 'react'
import styled from 'styled-components'
import { SASectionTitle } from 'src/components/SATitle'

// A white card with a title: the building block of the two-column forms (the product form, the business profile).
const SACard = ({ title, children }: { title: string; children: ReactNode }) => (
  <Card aria-label={title}>
    <SASectionTitle>{title}</SASectionTitle>
    {children}
  </Card>
)

export default SACard

const Card = styled.section`
  padding: ${({ theme }) => theme.padding}px ${({ theme }) => theme.paddingLG}px;
  background: ${({ theme }) => theme.colorBgContainer};
  border-radius: ${({ theme }) => theme.borderRadiusLG}px;

  h2.ant-typography {
    margin-bottom: ${({ theme }) => theme.margin}px;
  }
`
