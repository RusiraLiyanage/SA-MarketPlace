import { Menu } from 'antd'
import { Link, useLocation } from 'react-router'
import styled from 'styled-components'
import { PATHS } from 'src/router/paths'

// A tab is active for its own pages and the ones that belong to it: the cart and checkout sit under Shop.
const NAV_ITEMS = [
  { label: 'Shop', to: PATHS.shop, matches: ['/shop', '/cart', '/checkout'] },
  { label: 'My Orders', to: PATHS.orders, matches: ['/orders'] },
]

const HeaderNav = () => {
  const { pathname } = useLocation()
  const active = NAV_ITEMS.find(({ matches }) =>
    matches.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)),
  )

  return (
    <Nav
      mode="horizontal"
      selectedKeys={active ? [active.to] : []}
      items={NAV_ITEMS.map(({ label, to }) => ({
        key: to,
        label: (
          <Link to={to} aria-current={active?.to === to ? 'page' : undefined}>
            {label}
          </Link>
        ),
      }))}
    />
  )
}

export default HeaderNav

const Nav = styled(Menu)`
  flex: 1;
  min-width: 0;
  border-bottom: none;
  background: transparent;

  /* The tab is only as tall as its text, so the active underline sits right below it instead of at the bottom of the header. */
  && {
    line-height: ${({ theme }) => theme.fontSize * theme.lineHeight}px;
  }

  && .ant-menu-item {
    height: auto;
    padding-block: ${({ theme }) => theme.paddingXXS}px;
    line-height: inherit;
  }
`
