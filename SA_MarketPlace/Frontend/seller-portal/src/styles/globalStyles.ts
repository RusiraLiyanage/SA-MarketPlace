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

  /* Text for screen readers only, such as the heading of a column that holds only buttons. */
  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
  }

  /* A link in running text is told apart by more than its colour. */
  p a:not(.ant-btn) {
    text-decoration: underline;
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
