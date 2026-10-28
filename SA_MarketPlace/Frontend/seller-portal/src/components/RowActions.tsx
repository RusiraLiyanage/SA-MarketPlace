import styled from 'styled-components'

// The links and buttons at the end of a table row, side by side and never wrapped onto two lines.
const RowActions = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.margin}px;
  white-space: nowrap;

  .ant-btn-link {
    height: auto;
    padding: 0;
  }
`

export default RowActions
