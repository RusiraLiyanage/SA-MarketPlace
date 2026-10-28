import { Breadcrumb } from 'antd'
import { Link, useMatches } from 'react-router'
import type { RouteHandle } from 'src/router/handle'
import { usePageMeta } from 'src/router/pageMeta'

// Built from the deepest matched route that declares `handle.crumbs`, or the crumbs a page set once its data arrived.
// A trail of one is just the page's own title, so it is only shown from a second level on (`Orders › ORD-2026-00126`).
const SABreadcrumb = () => {
  const matches = useMatches()
  const override = usePageMeta()?.crumbs
  const match = [...matches].reverse().find((m) => (m.handle as RouteHandle | undefined)?.crumbs)
  if (!match) return null

  const trail = override ?? (match.handle as RouteHandle).crumbs!(match.params)
  if (trail.length < 2) return null

  const items = trail.map((crumb) => ({
    title: crumb.to ? <Link to={crumb.to}>{crumb.title}</Link> : crumb.title,
  }))

  return <Breadcrumb items={items} />
}

export default SABreadcrumb
