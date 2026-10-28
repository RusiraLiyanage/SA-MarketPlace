import { Navigate } from 'react-router'
import SALoadError from 'src/components/SALoadError'
import SASplashScreen from 'src/components/SASplashScreen'
import Approved from 'src/pages/Application/components/Approved'
import NotApproved from 'src/pages/Application/components/NotApproved'
import UnderReview from 'src/pages/Application/components/UnderReview'
import { PATHS } from 'src/router/paths'
import { useGetApplicationQuery } from 'src/store/application/actions'
import { hasPortalAccess } from 'src/store/application/selector'
import { ApplicationStatus } from 'src/store/application/types'

// Where a seller stands: under review, not approved, or newly approved. A decision is only seen the next time the status
// is asked for (the backend does not push it), so asking again every time this screen opens is what makes a revisit current.
const ApplicationPage = () => {
  const { data: application, error, isLoading, refetch } = useGetApplicationQuery(undefined, { refetchOnMountOrArgChange: true })

  if (isLoading) return <SASplashScreen />
  if (!application) return <SALoadError what="your application" error={error} onRetry={refetch} />
  if (hasPortalAccess(application)) return <Navigate to={PATHS.dashboard} replace />

  switch (application.status) {
    case ApplicationStatus.pendingReview:
      return <UnderReview application={application} />
    case ApplicationStatus.rejected:
      return <NotApproved application={application} />
    case ApplicationStatus.approved:
      return <Approved application={application} />
  }
}

export default ApplicationPage
