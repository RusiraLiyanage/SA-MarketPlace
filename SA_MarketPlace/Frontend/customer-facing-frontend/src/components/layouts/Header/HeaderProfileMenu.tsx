import { DownOutlined, LogoutOutlined, UserOutlined } from '@ant-design/icons'
import { Avatar, Button, Dropdown, Typography } from 'antd'
import { useNavigate } from 'react-router'
import styled from 'styled-components'
import { PATHS } from 'src/router/paths'
import { useGetProfileQuery } from 'src/store/profile/actions'
import { initials } from 'src/utils/format'

const HeaderProfileMenu = () => {
  const navigate = useNavigate()
  const { data: profile } = useGetProfileQuery()

  return (
    <Dropdown
      trigger={['click']}
      menu={{
        items: [
          { key: 'profile', label: 'My profile', icon: <UserOutlined /> },
          { key: 'sign-out', label: 'Sign out', icon: <LogoutOutlined />, danger: true },
        ],
        onClick: ({ key }) => navigate(key === 'sign-out' ? PATHS.signOut : PATHS.profile),
      }}
    >
      <Trigger type="text">
        <UserAvatar aria-hidden>{profile ? initials(profile.firstName, profile.lastName) : <UserOutlined />}</UserAvatar>
        <Details>
          <Typography.Text>{profile ? `${profile.firstName} ${profile.lastName}` : 'My account'}</Typography.Text>
          {profile?.organisationName && <Typography.Text type="secondary">{profile.organisationName}</Typography.Text>}
        </Details>
        <DownOutlined />
      </Trigger>
    </Dropdown>
  )
}

export default HeaderProfileMenu

const Trigger = styled(Button)`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.marginXS}px;
  height: auto;
  padding: ${({ theme }) => theme.paddingXXS}px ${({ theme }) => theme.paddingXS}px;
`

const UserAvatar = styled(Avatar)`
  background: ${({ theme }) => theme.colorPrimaryBg};
  color: ${({ theme }) => theme.colorPrimaryText};
  font-weight: 600;
`

const Details = styled.span`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  line-height: 1.25;

  .ant-typography:last-child {
    font-size: ${({ theme }) => theme.fontSizeSM}px;
  }
`
