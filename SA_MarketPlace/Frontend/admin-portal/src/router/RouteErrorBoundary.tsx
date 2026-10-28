import { isRouteErrorResponse, useRouteError } from 'react-router'
import SAErrorPage from 'src/components/SAErrorPage'

const RouteErrorBoundary = () => {
  const error = useRouteError()
  return isRouteErrorResponse(error) && error.status === 404 ? (
    <SAErrorPage status="404" title="Page not found" />
  ) : (
    <SAErrorPage status="500" title="Something went wrong" />
  )
}

export default RouteErrorBoundary
