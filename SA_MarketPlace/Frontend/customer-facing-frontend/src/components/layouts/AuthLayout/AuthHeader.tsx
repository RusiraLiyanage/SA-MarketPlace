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

const PROMPTS: Record<string, Prompt> = {
  [PATHS.login]: { text: 'New to the marketplace?', label: 'Create an account', to: PATHS.register },
  [PATHS.register]: { text: 'Already have an account?', label: 'Sign in', to: PATHS.login },
}
const DEFAULT_PROMPT: Prompt = { text: 'Remembered your password?', label: 'Sign in', to: PATHS.login }

const AuthHeader = () => {
  const { pathname } = useLocation()
  const { text, label, to } = PROMPTS[pathname] ?? DEFAULT_PROMPT

  return (
    <Bar>
      <SALogo />
      <Prompt>
        <Typography.Text type="secondary">{text}</Typography.Text>
        <Link to={to}>{label}</Link>
      </Prompt>
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
