import styled from 'styled-components'

// The small upper-case heading of a card on the fulfilment screen.
const CardLabel = styled.div`
  color: ${({ theme }) => theme.colorTextDescription};
  font-size: ${({ theme }) => theme.fontSizeSM}px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
`

export default CardLabel
