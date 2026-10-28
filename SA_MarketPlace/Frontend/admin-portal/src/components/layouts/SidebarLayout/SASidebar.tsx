import { MenuOutlined } from '@ant-design/icons'
import { Button, Drawer, Layout, Typography } from 'antd'
import { useState } from 'react'
import styled from 'styled-components'
import SideNav from 'src/components/layouts/SidebarLayout/SideNav'
import { useMediaQuery } from 'src/hooks/useMediaQuery'

interface Props {
  /** Supplier applications waiting for a decision; the badge on Suppliers, hidden at 0. */
  pendingApplications?: number
}

// Wide enough for the 240 px sidebar to sit beside the page.
const WIDE = '(min-width: 992px)'

// SA Admin's navigation: a sidebar instead of a top bar. Below 992 px it becomes a slim bar with a menu button
// that opens the same navigation in a drawer, so it is reachable by mouse, touch and keyboard alike.
const SASidebar = ({ pendingApplications = 0 }: Props) => {
  const wide = useMediaQuery(WIDE)
  const [open, setOpen] = useState(false)

  if (wide) {
    return (
      <Sider width={240}>
        <SideNav pendingApplications={pendingApplications} />
      </Sider>
    )
  }

  return (
    <>
      <Bar>
        <Button type="text" size="large" icon={<MenuOutlined />} aria-label="Open menu" aria-expanded={open} onClick={() => setOpen(true)} />
        <Typography.Text strong ellipsis>
          SA Admin
        </Typography.Text>
      </Bar>
      <Drawer placement="left" size={240} title="SA Admin" open={open} onClose={() => setOpen(false)} styles={{ body: { padding: 0 } }}>
        <SideNav pendingApplications={pendingApplications} showName={false} onNavigate={() => setOpen(false)} />
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
