import { createGlobalStyle } from 'styled-components'

const GlobalStyle = createGlobalStyle`
  html,
  body,
  #root {
    min-height: 100vh;
    margin: 0;
  }

  body {
    background: ${({ theme }) => theme.colorBgLayout};
    font-family: ${({ theme }) => theme.fontFamily};
  }

  /* A card's heading sits at the card's padding, not below an extra heading margin. */
  h1.ant-typography:first-child,
  h2.ant-typography:first-child,
  h3.ant-typography:first-child,
  h4.ant-typography:first-child,
  h5.ant-typography:first-child {
    margin-top: 0;
  }
`

export default GlobalStyle
