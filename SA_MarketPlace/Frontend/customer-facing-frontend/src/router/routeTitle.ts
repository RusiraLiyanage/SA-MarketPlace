import type { UIMatch } from 'react-router'
import { APP_NAME } from 'src/constants'
import type { RouteHandle } from 'src/router/handle'

// The page's name: the deepest matched route that has a `handle.title`, else the last breadcrumb of the deepest one
// that has crumbs. Pop-ups declare neither, so they keep the page they open over.
export const routeTitle = (matches: UIMatch[]): string | undefined => {
  for (const match of [...matches].reverse()) {
    const handle = match.handle as RouteHandle | undefined
    if (handle?.title) return handle.title
    const crumbs = handle?.crumbs?.(match.params)
    if (crumbs?.length) return crumbs[crumbs.length - 1]!.title
  }
  return undefined
}

// The brand comes first, so it still shows in a narrow tab where the end of a long page name is cut off.
export const documentTitle = (title: string): string => `${APP_NAME} · ${title}`
