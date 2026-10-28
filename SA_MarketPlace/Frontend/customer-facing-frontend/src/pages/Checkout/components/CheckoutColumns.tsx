import type { ReactNode } from 'react'
import styled from 'styled-components'

interface Props {
  /** The step's forms and cards. */
  children: ReactNode
  /** The order summary, with the step's button. */
  aside: ReactNode
}

// The step's content on the left and the order summary on the right.
const CheckoutColumns = ({ children, aside }: Props) => (
  <Grid>
    <Main>{children}</Main>
    <aside>{aside}</aside>
  </Grid>
)

export default CheckoutColumns

const Grid = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) 360px;
  gap: ${({ theme }) => theme.marginLG}px;
  align-items: start;
`

const Main = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.margin}px;
`
