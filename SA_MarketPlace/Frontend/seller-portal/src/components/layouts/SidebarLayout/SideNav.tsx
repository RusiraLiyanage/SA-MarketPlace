import { AppstoreOutlined, BookOutlined, ShoppingOutlined, UserOutlined } from '@ant-design/icons'
import { Badge, Menu, Typography } from 'antd'
import type { ReactNode } from 'react'
import { Link, useLocation } from 'react-router'
import styled from 'styled-components'
import { PATHS } from 'src/router/paths'

interface Props {
  /** The seller's business, shown in capitals above the menu. Left out where the container already shows it. */
  businessName?: string
  /** Published listings at or below their low-stock threshold; the badge on Catalogue, hidden at 0. */
  listingsNeedingAttention: number
  /** Called when a link is followed, so a drawer can close itself. */
  onNavigate?: () => void
}

interface NavItem {
  to: string
  label: string
  icon: ReactNode
  /** Selected only on its own path; the dashboard is "/", which every path starts with. */
  exact?: boolean
}

const ITEMS: readonly NavItem[] = [
  { to: PATHS.dashboard, label: 'Dashboard', icon: <AppstoreOutlined />, exact: true },
  { to: PATHS.orders, label: 'Orders', icon: <ShoppingOutlined /> },
  { to: PATHS.catalogue, label: 'Catalogue', icon: <BookOutlined /> },
  { to: PATHS.profile, label: 'Business profile', icon: <UserOutlined /> },
]

// An item is selected for its own page and the ones under it: an order's page keeps Orders selected.
const isActive = (pathname: string, { to, exact }: NavItem) =>
  exact ? pathname === to : pathname === to || pathname.startsWith(`${to}/`)

// The seller portal's navigation, the same in the sidebar and in the drawer that replaces it on narrow screens.
const SideNav = ({ businessName, listingsNeedingAttention, onNavigate }: Props) => {
  const { pathname } = useLocation()
  const active = ITEMS.find((item) => isActive(pathname, item))

  return (
    <nav aria-label="Main">
      {businessName !== undefined && <Business>{businessName}</Business>}
      <Menu
        mode="inline"
        selectedKeys={active ? [active.to] : []}
        items={ITEMS.map(({ to, label, icon }) => ({
          key: to,
          icon,
          label: (
            <Link to={to} aria-current={active?.to === to ? 'page' : undefined} onClick={onNavigate}>
              {label}
              {to === PATHS.catalogue && listingsNeedingAttention > 0 && (
                <Count count={listingsNeedingAttention} overflowCount={99} aria-label={`${listingsNeedingAttention} need attention`} />
              )}
            </Link>
          ),
        }))}
      />
    </nav>
  )
}

export default SideNav

const Business = styled(Typography.Text)`
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
    color: #1f1f1f;
    box-shadow: none;
  }
`
