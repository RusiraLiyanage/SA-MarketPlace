import { Button } from 'antd'
import { useNavigate, useParams } from 'react-router'
import SAEmpty from 'src/components/SAEmpty'
import SALoadError from 'src/components/SALoadError'
import SAPageHeader from 'src/components/SAPageHeader'
import SASkeleton from 'src/components/SASkeleton'
import { ERROR_CODE, isApiError } from 'src/infra/errors'
import ApplicationView from 'src/pages/SupplierApplication/components/ApplicationView'
import { PATHS } from 'src/router/paths'
import { useGetSupplierApplicationQuery } from 'src/store/suppliers/actions'

const TITLE = 'Supplier application'

const SupplierApplicationPage = () => {
  const { supplierId = '' } = useParams()
  const navigate = useNavigate()
  // `currentData` belongs to the id in the address. `data` would hold the previous application while this one loads or fails,
  // so a mistyped link would show someone else's details.
  const { currentData: application, error, isFetching, refetch } = useGetSupplierApplicationQuery(supplierId)

  if (isFetching && !application) {
    return (
      <>
        <SAPageHeader title={TITLE} />
        <SASkeleton rows={8} />
      </>
    )
  }

  if (!application) {
    // 404 is an application that does not exist; 400 is an address that is not even an id.
    const notFound = isApiError(error) && (error.code === ERROR_CODE.notFound || error.code === ERROR_CODE.badRequest)
    return (
      <>
        <SAPageHeader title={TITLE} />
        {notFound ? (
          <SAEmpty
            title="Application not found"
            description="It may have been removed, or the link is wrong."
            action={<Button onClick={() => navigate(PATHS.suppliers)}>Back to suppliers</Button>}
          />
        ) : (
          <SALoadError what="this application" error={error} onRetry={refetch} />
        )}
      </>
    )
  }

  // Keyed by supplier, so one application's checklist never carries over to the next.
  return <ApplicationView key={application.id} application={application} />
}

export default SupplierApplicationPage
