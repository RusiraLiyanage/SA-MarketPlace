import { App } from 'antd'
import { useOutletContext } from 'react-router'
import SADialog, { SADialogNote, SADialogPoints, SADialogSection } from 'src/components/SADialog'
import { useDecisionFailure } from 'src/hooks/useDecisionFailure'
import { useRouteModal } from 'src/hooks/useRouteModal'
import type { ApplicationOutletContext } from 'src/pages/SupplierApplication/applicationOutletContext'
import { useApproveSupplierMutation } from 'src/store/suppliers/actions'

// Opens over a pending application. Approval is the switch that makes the supplier's published listings visible to buyers (backend
// ADR 0041) and it emails the contact that they can sign in. It cannot be undone here: this version has no way to suspend a supplier.
const ApproveSupplierModal = () => {
  const { application } = useOutletContext<ApplicationOutletContext>()
  const { close } = useRouteModal()
  const { message } = App.useApp()
  const failed = useDecisionFailure()
  const [approve, { isLoading }] = useApproveSupplierMutation()

  const confirm = async () => {
    try {
      await approve(application.id).unwrap()
      message.success(`${application.businessName} approved`)
      close()
    } catch (error) {
      failed(error)
    }
  }

  return (
    <SADialog
      tone="success"
      width={560}
      title={`Approve ${application.businessName}?`}
      summary="They will be notified by email and can sign in right away."
      onCancel={close}
      actions={[
        { key: 'cancel', label: 'Cancel', onClick: close, disabled: isLoading },
        { key: 'approve', label: 'Approve supplier', kind: 'primary', loading: isLoading, onClick: confirm },
      ]}
    >
      <SADialogSection title="What changes">
        <SADialogPoints
          kind="keep"
          points={[
            { title: 'The supplier is told by email.', detail: `Sent to ${application.contactEmail}, saying they can sign in now.` },
            { title: 'They can use the seller portal.', detail: 'Their account is opened for listing products and taking orders.' },
            { title: 'Their published listings become visible to buyers.', detail: 'Approval is the switch; there is no separate publish step.' },
          ]}
        />
      </SADialogSection>
      <SADialogNote tone="warning" title="This cannot be undone here.">
        There is no way to suspend a supplier in this version, so check the details first.
      </SADialogNote>
    </SADialog>
  )
}

export default ApproveSupplierModal
