import { IdcardOutlined, ShoppingOutlined, UserOutlined } from '@ant-design/icons'
import { Badge, Menu, Typography } from 'antd'
import type { ReactNode } from 'react'
import { Link, useLocation } from 'react-router'
import styled from 'styled-components'
import { PATHS } from 'src/router/paths'

interface Props {
  /** Supplier applications waiting for a decision; the badge on Suppliers, hidden at 0. */
  pendingApplications?: number
  /** Show the app's name above the menu. Left out where the container already shows it. */
  showName?: boolean
  /** Called when a link is followed, so a drawer can close itself. */
  onNavigate?: () => void
}

interface NavItem {
  to: string
  label: string
  icon: ReactNode
}

const ITEMS: readonly NavItem[] = [
  { to: PATHS.suppliers, label: 'Suppliers', icon: <UserOutlined /> },
  { to: PATHS.orders, label: 'Orders', icon: <ShoppingOutlined /> },
  { to: PATHS.profile, label: 'My Profile', icon: <IdcardOutlined /> },
]

// An item is selected for its own page and the ones under it: an application's page keeps Suppliers selected.
const isActive = (pathname: string, { to }: NavItem) => pathname === to || pathname.startsWith(`${to}/`)

// SA Admin's navigation, the same in the sidebar and in the drawer that replaces it on narrow screens.
const SideNav = ({ pendingApplications = 0, showName = true, onNavigate }: Props) => {
  const { pathname } = useLocation()
  const active = ITEMS.find((item) => isActive(pathname, item))

  return (
    <nav aria-label="Main">
      {showName && <Name>SA Admin</Name>}
      <Menu
        mode="inline"
        selectedKeys={active ? [active.to] : []}
        items={ITEMS.map(({ to, label, icon }) => ({
          key: to,
          icon,
          label: (
            <Link to={to} aria-current={active?.to === to ? 'page' : undefined} onClick={onNavigate}>
              {label}
              {to === PATHS.suppliers && pendingApplications > 0 && (
                <Count count={pendingApplications} overflowCount={99} aria-label={`${pendingApplications} awaiting review`} />
              )}
            </Link>
          ),
        }))}
      />
    </nav>
  )
}

export default SideNav

const Name = styled(Typography.Text)`
  display: block;
  min-height: ${({ theme }) => theme.paddingLG * 2 + theme.paddingSM}px;
  padding: ${({ theme }) => theme.paddingLG}px ${({ theme }) => theme.padding}px ${({ theme }) => theme.paddingSM}px;
  color: ${({ theme }) => theme.colorTextDescription};
  font-size: ${({ theme }) => theme.fontSizeSM}px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
`

const Count = styled(Badge)`
  margin-inline-start: ${({ theme }) => theme.marginXS}px;

  .ant-badge-count {
    background: ${({ theme }) => theme.colorPrimary};
    box-shadow: none;
  }
`
