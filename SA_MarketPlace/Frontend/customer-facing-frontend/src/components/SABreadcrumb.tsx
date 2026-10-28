import { Breadcrumb } from 'antd'
import { Link, useMatches } from 'react-router'
import styled from 'styled-components'
import type { RouteHandle } from 'src/router/handle'
import { usePageMeta } from 'src/router/pageMeta'
import { PATHS } from 'src/router/paths'

// Built from the deepest matched route that declares `handle.crumbs`, or the crumbs a page set once its data arrived;
// pages without either show no breadcrumb.
const SABreadcrumb = () => {
  const matches = useMatches()
  const override = usePageMeta()?.crumbs
  const match = [...matches].reverse().find((m) => (m.handle as RouteHandle | undefined)?.crumbs)
  if (!match) return null

  const trail = override ?? (match.handle as RouteHandle).crumbs!(match.params)
  const items = [
    { title: <Link to={PATHS.shop}>Home</Link> },
    ...trail.map((crumb) => ({
      title: crumb.to ? <Link to={crumb.to}>{crumb.title}</Link> : crumb.title,
    })),
  ]

  return (
    <Bar>
      <Breadcrumb items={items} />
    </Bar>
  )
}

export default SABreadcrumb

const Bar = styled.div`
  padding: ${({ theme }) => theme.paddingSM}px ${({ theme }) => theme.paddingLG}px;
  background: ${({ theme }) => theme.colorBgContainer};
  border-bottom: 1px solid ${({ theme }) => theme.colorBorderSecondary};
`
