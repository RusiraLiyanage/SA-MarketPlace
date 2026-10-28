import { Button, Flex } from 'antd'
import { useState } from 'react'
import { Outlet, useNavigate } from 'react-router'
import styled from 'styled-components'
import SAPageHeader from 'src/components/SAPageHeader'
import SAToneTag from 'src/components/SAToneTag'
import type { ApplicationOutletContext } from 'src/pages/SupplierApplication/applicationOutletContext'
import DetailsCard from 'src/pages/SupplierApplication/components/DetailsCard'
import VerificationChecklist from 'src/pages/SupplierApplication/components/VerificationChecklist'
import { VERIFICATION_CHECKS, VERIFICATION_STATUS_ID } from 'src/pages/SupplierApplication/verificationChecks'
import { usePageCrumbs } from 'src/router/pageMeta'
import { PATHS } from 'src/router/paths'
import { categoriesLabel, SUPPLIER_STATUS_DISPLAY } from 'src/store/suppliers/selector'
import { SupplierStatus, type SupplierApplicationDetail } from 'src/store/suppliers/types'
import { formatAbn } from 'src/utils/abn'
import { formatDate } from 'src/utils/format'

// One application: what the supplier told us, the manual checklist, and Reject and Approve while it is waiting. Approve stays
// disabled until every check is ticked; Reject is always available. Once it is
// decided the buttons and the checklist give way to who decided it, when, and why. The pop-ups open over it as child routes.
const ApplicationView = ({ application }: { application: SupplierApplicationDetail }) => {
  const navigate = useNavigate()
  const [checksDone, setChecksDone] = useState<readonly string[]>([])
  const { id, businessName, status } = application
  const pending = status === SupplierStatus.pendingReview
  const { label, tone } = SUPPLIER_STATUS_DISPLAY[status]
  const context: ApplicationOutletContext = { application }
  // The route's own trail says "Application"; the supplier's name is more use.
  usePageCrumbs([{ title: 'Suppliers', to: PATHS.suppliers }, { title: businessName }])

  return (
    <>
      <SAPageHeader
        title="Supplier application"
        tag={<SAToneTag tone={tone}>{label}</SAToneTag>}
        extra={
          pending && (
            <Flex gap="small">
              <Button danger size="large" onClick={() => navigate(PATHS.rejectSupplier(id))}>
                Reject
              </Button>
              <Button
                type="primary"
                size="large"
                disabled={checksDone.length < VERIFICATION_CHECKS.length}
                aria-describedby={VERIFICATION_STATUS_ID}
                onClick={() => navigate(PATHS.approveSupplier(id))}
              >
                Approve supplier
              </Button>
            </Flex>
          )
        }
      />
      <Columns>
        <DetailsCard
          title="Business details"
          rows={[
            { label: 'Business / trading name', value: businessName },
            { label: 'ABN', value: formatAbn(application.abn) },
            { label: 'Business type', value: application.businessType ?? 'Not given' },
            { label: 'Product categories', value: categoriesLabel(application.productCategories) },
            { label: 'Submitted', value: formatDate(application.submittedAt) },
          ]}
        />
        <DetailsCard
          title="Primary contact"
          rows={[
            { label: 'Contact name', value: application.contactName },
            { label: 'Email address', value: application.contactEmail },
            { label: 'Phone number', value: application.contactPhone ?? 'Not provided' },
          ]}
        />
      </Columns>
      {pending ? (
        <VerificationChecklist done={checksDone} onChange={setChecksDone} />
      ) : (
        <DetailsCard
          title="Decision"
          rows={[
            { label: 'Decision', value: label },
            { label: 'Decided by', value: application.reviewedByName ?? 'Not recorded' },
            { label: 'Date', value: application.reviewedAt ? formatDate(application.reviewedAt) : 'Not recorded' },
            ...(status === SupplierStatus.rejected ? [{ label: 'Reason shown to the applicant', value: application.rejectionReason ?? 'Not recorded' }] : []),
          ]}
        />
      )}
      <Outlet context={context} />
    </>
  )
}

export default ApplicationView

const Columns = styled.div`
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: ${({ theme }) => theme.margin}px;
  align-items: start;
`
