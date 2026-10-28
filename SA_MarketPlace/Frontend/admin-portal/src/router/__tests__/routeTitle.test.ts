import type { UIMatch } from 'react-router'
import { describe, expect, it } from 'vitest'
import type { RouteHandle } from 'src/router/handle'
import { documentTitle, routeTitle } from 'src/router/routeTitle'

const match = (handle?: RouteHandle, params: Record<string, string> = {}) =>
  ({ id: 'x', pathname: '/', params, loaderData: undefined, handle }) satisfies UIMatch

describe('routeTitle', () => {
  it('uses the title a route declares', () => {
    expect(routeTitle([match(), match({ title: 'Shop' })])).toBe('Shop')
  })

  it('falls back to the last breadcrumb', () => {
    const handle: RouteHandle = { crumbs: ({ orderNumber }) => [{ title: 'My orders' }, { title: orderNumber ?? '' }] }

    expect(routeTitle([match(handle, { orderNumber: 'ORD-2026-00123' })])).toBe('ORD-2026-00123')
  })

  it('keeps the page a pop-up opens over, since the pop-up names nothing', () => {
    expect(routeTitle([match({ title: 'My profile' }), match()])).toBe('My profile')
  })

  it('has no title when no route names one', () => {
    expect(routeTitle([match(), match({})])).toBeUndefined()
  })

  it('puts the app name before the page name', () => {
    expect(documentTitle('Orders')).toBe('Sample Assist Admin · Orders')
  })
})
