import { ApplicationStatus, type Application } from 'src/store/application/types'

/**
 * Whether the seller may use the portal proper: approved, and past the one-time notice. Everyone else belongs on the
 * application screen: pending and rejected sellers see where they stand, and a newly approved one sees the notice.
 */
export const hasPortalAccess = (application: Application): boolean =>
  application.status === ApplicationStatus.approved && application.acknowledged
