import { Layout } from 'antd'
import styled from 'styled-components'
import HeaderCartButton from 'src/components/layouts/Header/HeaderCartButton'
import HeaderLogo from 'src/components/layouts/Header/HeaderLogo'
import HeaderNav from 'src/components/layouts/Header/HeaderNav'
import HeaderProfileMenu from 'src/components/layouts/Header/HeaderProfileMenu'

const Header = () => (
  <Bar>
    <HeaderLogo />
    <HeaderNav />
    <HeaderCartButton />
    <HeaderProfileMenu />
  </Bar>
)

export default Header

const Bar = styled(Layout.Header)`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.marginLG}px;
  border-bottom: 1px solid ${({ theme }) => theme.colorBorderSecondary};
`
