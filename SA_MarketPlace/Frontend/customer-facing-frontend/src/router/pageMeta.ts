import { createContext, useContext, useEffect } from 'react'
import type { Crumb } from 'src/router/handle'

interface PageMeta {
  /** Breadcrumbs a page set for itself once its data arrived; they win over the route's own. */
  crumbs: Crumb[] | undefined
  setCrumbs: (crumbs: Crumb[] | undefined) => void
}

export const PageMetaContext = createContext<PageMeta | null>(null)

export const usePageMeta = () => useContext(PageMetaContext)

// For a page whose breadcrumbs depend on what it loaded (a product's category and name). The route's own crumbs show
// until then, and again when the page goes away. Pass undefined while the data is still loading.
export const usePageCrumbs = (crumbs: Crumb[] | undefined) => {
  const setCrumbs = usePageMeta()?.setCrumbs
  const key = JSON.stringify(crumbs ?? null)

  useEffect(() => {
    setCrumbs?.(crumbs)
    return () => setCrumbs?.(undefined)
    // `key` stands for `crumbs`, which is a new array on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, setCrumbs])
}
