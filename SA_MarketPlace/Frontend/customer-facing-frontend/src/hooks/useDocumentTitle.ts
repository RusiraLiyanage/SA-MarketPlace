import { useEffect } from 'react'
import { documentTitle } from 'src/router/routeTitle'

// Names the browser tab, which is also what a screen reader announces when the page loads.
export const useDocumentTitle = (title: string | undefined) => {
  useEffect(() => {
    if (title) document.title = documentTitle(title)
  }, [title])
}
