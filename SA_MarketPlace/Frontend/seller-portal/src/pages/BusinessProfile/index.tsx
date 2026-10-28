import { Outlet } from 'react-router'
import SALoadError from 'src/components/SALoadError'
import SAPageHeader from 'src/components/SAPageHeader'
import SASkeleton from 'src/components/SASkeleton'
import ProfileView from 'src/pages/BusinessProfile/components/ProfileView'
import { useGetProfileQuery } from 'src/store/profile/actions'

// The sign-out pop-up opens over it as a child route.
const BusinessProfilePage = () => {
  const profile = useGetProfileQuery()

  return (
    <>
      {profile.data ? (
        <ProfileView profile={profile.data} />
      ) : (
        <>
          <SAPageHeader title="Business profile" />
          {profile.isLoading ? <SASkeleton rows={8} /> : <SALoadError what="your business profile" error={profile.error} onRetry={profile.refetch} />}
        </>
      )}
      <Outlet />
    </>
  )
}

export default BusinessProfilePage
