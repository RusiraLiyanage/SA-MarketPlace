import { useEffect, useRef } from 'react'
import { useBlocker, type Blocker } from 'react-router'
import { PATHS } from 'src/router/paths'

// Moving within the same page (a pop-up that is a child route, or only the query changing) is not leaving it.
const isSamePage = (current: string, next: string) => next === current || next.startsWith(`${current}/`)

// Where a seller goes when the session ends (signing out, an expired session): the edits are gone with it, so asking is no use.
const SESSION_ENDED: string[] = [PATHS.login, PATHS.sessionExpired]

/**
 * Stops the seller leaving a page that holds edits they have not saved. While `dirty`, any move to another page is held and
 * `blocker` says so, for `UnsavedChangesDialog` to ask; closing or reloading the tab gets the browser's own warning.
 * `allowLeave` is for a page that navigates away itself after saving.
 */
export const useUnsavedChanges = (dirty: boolean): { blocker: Blocker; allowLeave: () => void } => {
  const leaving = useRef(false)
  const blocker = useBlocker(
    ({ currentLocation, nextLocation }) =>
      dirty &&
      !leaving.current &&
      !isSamePage(currentLocation.pathname, nextLocation.pathname) &&
      !SESSION_ENDED.includes(nextLocation.pathname),
  )

  useEffect(() => {
    if (!dirty) return
    const warn = (event: BeforeUnloadEvent) => {
      if (!leaving.current) event.preventDefault()
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  return { blocker, allowLeave: () => (leaving.current = true) }
}
