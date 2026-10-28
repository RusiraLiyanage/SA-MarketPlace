import { Button, Result } from 'antd'
import { getErrorMessage } from 'src/infra/errors'

interface Props {
  /** What could not be loaded, for example "your profile". */
  what: string
  error: unknown
  onRetry: () => void
}

// What a page shows when its data could not be loaded: the reason, and a way to try again.
const SALoadError = ({ what, error, onRetry }: Props) => (
  <Result
    status="warning"
    title={`We could not load ${what}`}
    subTitle={getErrorMessage(error)}
    extra={
      <Button type="primary" onClick={onRetry}>
        Try again
      </Button>
    }
  />
)

export default SALoadError
