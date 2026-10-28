import type { ComponentType } from 'react'
import type { RouteObject } from 'react-router'

// Code-splits a page: the chunk loads when its route is first matched.
export const lazyPage = (
  load: () => Promise<{ default: ComponentType }>,
): Pick<RouteObject, 'lazy'> => ({
  lazy: async () => ({ Component: (await load()).default }),
})
