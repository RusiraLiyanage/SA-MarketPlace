import { MenuOutlined } from '@ant-design/icons'
import { Button, Drawer, Layout, Typography } from 'antd'
import { useState } from 'react'
import styled from 'styled-components'
import SideNav from 'src/components/layouts/SidebarLayout/SideNav'
import { useMediaQuery } from 'src/hooks/useMediaQuery'

interface Props {
  /** The seller's business, shown in capitals above the menu. */
  businessName: string
  /** Published listings at or below their low-stock threshold; the badge on Catalogue, hidden at 0. */
  listingsNeedingAttention: number
}

// Wide enough for the 240 px sidebar to sit beside the page.
const WIDE = '(min-width: 992px)'

// The seller portal's navigation: a sidebar instead of a top bar. Below 992 px it becomes a slim bar with a menu button
// that opens the same navigation in a drawer, so it is reachable by mouse, touch and keyboard alike.
const SASidebar = ({ businessName, listingsNeedingAttention }: Props) => {
  const wide = useMediaQuery(WIDE)
  const [open, setOpen] = useState(false)

  if (wide) {
    return (
      <Sider width={240}>
        <SideNav businessName={businessName} listingsNeedingAttention={listingsNeedingAttention} />
      </Sider>
    )
  }

  return (
    <>
      <Bar>
        <Button type="text" size="large" icon={<MenuOutlined />} aria-label="Open menu" aria-expanded={open} onClick={() => setOpen(true)} />
        <Typography.Text strong ellipsis>
          {businessName}
        </Typography.Text>
      </Bar>
      <Drawer placement="left" size={240} title={businessName || 'Menu'} open={open} onClose={() => setOpen(false)} styles={{ body: { padding: 0 } }}>
        <SideNav listingsNeedingAttention={listingsNeedingAttention} onNavigate={() => setOpen(false)} />
      </Drawer>
    </>
  )
}

export default SASidebar

const Sider = styled(Layout.Sider)`
  border-right: 1px solid ${({ theme }) => theme.colorBorderSecondary};

  /* The selected item is a tinted row with a bar on its left edge. */
  .ant-menu-item {
    width: 100%;
    margin: 0;
    border-radius: 0;
  }

  .ant-menu-item-selected {
    box-shadow: inset 3px 0 0 ${({ theme }) => theme.colorPrimary};
    font-weight: 600;
  }
`

const Bar = styled.header`
  position: sticky;
  z-index: 10;
  top: 0;
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.marginXS}px;
  padding: ${({ theme }) => theme.paddingXS}px ${({ theme }) => theme.padding}px;
  background: ${({ theme }) => theme.colorBgContainer};
  border-bottom: 1px solid ${({ theme }) => theme.colorBorderSecondary};
`
