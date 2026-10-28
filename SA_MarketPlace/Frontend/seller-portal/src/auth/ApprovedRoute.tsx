import { Navigate, Outlet } from 'react-router'
import SALoadError from 'src/components/SALoadError'
import SASplashScreen from 'src/components/SASplashScreen'
import { PATHS } from 'src/router/paths'
import { useGetApplicationQuery } from 'src/store/application/actions'
import { hasPortalAccess } from 'src/store/application/selector'

// The pages for approved sellers. After signing in, the application's status decides where a seller belongs (backend ADR
// 0032): the portal, or the screen that says where their application stands. The status is asked again whenever the
// window is focused, so a decision made while they are signed in sends them on without signing in again.
const ApprovedRoute = () => {
  const { data: application, error, isLoading, refetch } = useGetApplicationQuery()

  if (isLoading) return <SASplashScreen />
  if (!application) return <SALoadError what="your application" error={error} onRetry={refetch} />

  return hasPortalAccess(application) ? <Outlet /> : <Navigate to={PATHS.application} replace />
}

export default ApprovedRoute
