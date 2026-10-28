import { Layout, Typography } from 'antd'
import { Link, useLocation } from 'react-router'
import styled from 'styled-components'
import SALogo from 'src/components/SALogo'
import { PATHS } from 'src/router/paths'

// The prompt on the right points to the page you are not on.
interface Prompt {
  text: string
  label: string
  to: string
}

interface HeaderContent {
  /** The small capitals under the logo. */
  line: string
  prompt?: Prompt
}

const PORTAL = 'SELLER PORTAL'
const REGISTRATION = 'SELLER REGISTRATION'

const CONTENT: Record<string, HeaderContent> = {
  [PATHS.login]: {
    line: PORTAL,
    prompt: { text: 'New supplier?', label: 'Register your business', to: PATHS.register },
  },
  [PATHS.register]: {
    line: REGISTRATION,
    prompt: { text: 'Already registered?', label: 'Sign in', to: PATHS.login },
  },
  [PATHS.application]: { line: REGISTRATION },
  [PATHS.resubmitApplication]: { line: REGISTRATION },
}
const DEFAULT_CONTENT: HeaderContent = { line: PORTAL }

const AuthHeader = () => {
  const { pathname } = useLocation()
  const { line, prompt } = CONTENT[pathname] ?? DEFAULT_CONTENT

  return (
    <Bar>
      <SALogo line={line} />
      {prompt && (
        <Prompt>
          <Typography.Text type="secondary">{prompt.text}</Typography.Text>
          <Link to={prompt.to}>{prompt.label}</Link>
        </Prompt>
      )}
    </Bar>
  )
}

export default AuthHeader

const Bar = styled(Layout.Header)`
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid ${({ theme }) => theme.colorBorderSecondary};
`

const Prompt = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  line-height: 1.25;
  font-size: ${({ theme }) => theme.fontSizeSM}px;

  a {
    font-weight: 600;
  }
`
