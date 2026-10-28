import { Outlet, useMatches, useNavigation } from 'react-router'
import styled, { keyframes } from 'styled-components'
import { useDocumentTitle } from 'src/hooks/useDocumentTitle'
import PageMetaProvider from 'src/router/PageMetaProvider'
import { usePageMeta } from 'src/router/pageMeta'
import { routeTitle } from 'src/router/routeTitle'

// Wraps every route: names the tab after the page, announces the new page to screen readers (the app never reloads),
// and shows a thin bar while the next page's code is loading.
const RootLayout = () => (
  <PageMetaProvider>
    <Page />
  </PageMetaProvider>
)

const Page = () => {
  const crumbs = usePageMeta()?.crumbs
  const routeName = routeTitle(useMatches())
  const title = crumbs?.length ? crumbs[crumbs.length - 1]!.title : routeName
  const loading = useNavigation().state !== 'idle'
  useDocumentTitle(title)

  return (
    <>
      {loading && <Progress aria-hidden />}
      <Announcer role="status" aria-live="polite">
        {title}
      </Announcer>
      <Outlet />
    </>
  )
}

export default RootLayout

const slide = keyframes`
  from { transform: translateX(-100%); }
  to { transform: translateX(100%); }
`

const Progress = styled.div`
  position: fixed;
  z-index: 2000;
  top: 0;
  left: 0;
  width: 100%;
  height: 3px;
  overflow: hidden;

  &::after {
    content: '';
    display: block;
    width: 40%;
    height: 100%;
    background: ${({ theme }) => theme.colorPrimary};
    animation: ${slide} 1s ease-in-out infinite;
  }

  @media (prefers-reduced-motion: reduce) {
    &::after {
      width: 100%;
      animation: none;
    }
  }
`

// Visually hidden but read out.
const Announcer = styled.div`
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
`
