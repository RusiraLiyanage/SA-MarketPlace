import styled from 'styled-components'

export const MAIN_CONTENT_ID = 'main-content'

// The first thing a keyboard user tabs to: jumps past the header to the page. Hidden until it has focus.
const SASkipLink = () => <Link href={`#${MAIN_CONTENT_ID}`}>Skip to main content</Link>

export default SASkipLink

const Link = styled.a`
  position: absolute;
  z-index: 2100;
  top: ${({ theme }) => theme.marginXS}px;
  left: ${({ theme }) => theme.marginXS}px;
  padding: ${({ theme }) => theme.paddingXS}px ${({ theme }) => theme.padding}px;
  background: ${({ theme }) => theme.colorBgContainer};
  border-radius: ${({ theme }) => theme.borderRadius}px;
  box-shadow: ${({ theme }) => theme.boxShadowSecondary};
  transform: translateY(-200%);

  &:focus {
    transform: none;
  }
`
