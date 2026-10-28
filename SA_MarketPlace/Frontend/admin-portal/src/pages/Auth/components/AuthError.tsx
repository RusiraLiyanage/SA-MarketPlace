import { Alert } from 'antd'
import styled from 'styled-components'
import { ERROR_CODE, getErrorMessage, isApiError } from 'src/infra/errors'

// The backend limits sign-in, registration and reset requests to a few a minute from one address.
const TOO_MANY = 'Too many attempts. Please wait a minute and try again.'

// Shows why a sign-in, registration or reset request failed; nothing while there is no failure.
const AuthError = ({ error }: { error: unknown }) => {
  if (!error) return null

  const message = isApiError(error) && error.code === ERROR_CODE.tooManyRequests ? TOO_MANY : getErrorMessage(error)
  return <Notice showIcon type="error" title={message} />
}

export default AuthError

const Notice = styled(Alert)`
  margin-bottom: ${({ theme }) => theme.margin}px;
`
