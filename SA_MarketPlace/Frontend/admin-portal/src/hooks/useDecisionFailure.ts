import { App } from 'antd'
import { api } from 'src/infra/api'
import { ERROR_CODE, getErrorMessage, isApiError } from 'src/infra/errors'
import { useAppDispatch } from 'src/store/hooks'

/**
 * What to do when approving or rejecting is refused. The backend's reason is shown; and if another admin got there first (409), the
 * queue and the application are fetched again, so the screen shows the decision that was made instead of a stale "pending".
 */
export const useDecisionFailure = () => {
  const { message } = App.useApp()
  const dispatch = useAppDispatch()

  return (error: unknown) => {
    message.error(getErrorMessage(error))
    if (isApiError(error) && error.code === ERROR_CODE.conflict) dispatch(api.util.invalidateTags(['Supplier', 'Summary']))
  }
}
