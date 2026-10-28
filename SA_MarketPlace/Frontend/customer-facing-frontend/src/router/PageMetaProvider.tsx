import { useMemo, useState, type ReactNode } from 'react'
import type { Crumb } from 'src/router/handle'
import { PageMetaContext } from 'src/router/pageMeta'

const PageMetaProvider = ({ children }: { children: ReactNode }) => {
  const [crumbs, setCrumbs] = useState<Crumb[]>()
  const value = useMemo(() => ({ crumbs, setCrumbs }), [crumbs])

  return <PageMetaContext.Provider value={value}>{children}</PageMetaContext.Provider>
}

export default PageMetaProvider
