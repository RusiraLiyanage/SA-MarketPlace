import type { Params } from 'react-router'

export interface Crumb {
  title: string
  to?: string
}

// Set as `handle` on a route; the deepest matched route's trail is shown by SABreadcrumb.
export interface RouteHandle {
  crumbs?: (params: Params) => Crumb[]
  /** The page's name for the browser tab and for screen readers; defaults to the last breadcrumb. */
  title?: string
}
