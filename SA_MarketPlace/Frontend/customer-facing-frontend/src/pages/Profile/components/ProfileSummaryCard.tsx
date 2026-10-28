import { ArrowRightOutlined } from '@ant-design/icons'
import { Avatar, Typography } from 'antd'
import { Link } from 'react-router'
import styled from 'styled-components'
import ProfileCard from 'src/pages/Profile/components/ProfileCard'
import { PATHS } from 'src/router/paths'
import type { MyProfile, UserRole } from 'src/types'
import { formatMonthYear, initials } from 'src/utils/format'

const ROLE_LABELS: Record<UserRole, string> = {
  buyer: 'Buyer',
  seller: 'Seller',
  collection_manager: 'Collection Manager',
  admin: 'Admin',
}

type Props = Pick<MyProfile, 'firstName' | 'lastName' | 'organisationName' | 'roles' | 'memberSince' | 'ordersPlaced'>

const ProfileSummaryCard = ({ firstName, lastName, organisationName, roles, memberSince, ordersPlaced }: Props) => (
  <ProfileCard aria-label="Profile summary">
    <Identity>
      <UserAvatar size={56}>{initials(firstName, lastName)}</UserAvatar>
      <div>
        <Name>{`${firstName} ${lastName}`}</Name>
        <Typography.Text type="secondary">
          {[roles.map((role) => ROLE_LABELS[role]).join(', '), organisationName].filter(Boolean).join(' · ')}
        </Typography.Text>
      </div>
    </Identity>
    <Facts>
      <Fact>
        <dt>Member since</dt>
        <dd>{formatMonthYear(memberSince)}</dd>
      </Fact>
      <Fact>
        <dt>Orders placed</dt>
        <dd>{ordersPlaced}</dd>
      </Fact>
    </Facts>
    <Link to={PATHS.orders}>
      View my orders <ArrowRightOutlined />
    </Link>
  </ProfileCard>
)

export default ProfileSummaryCard

const Identity = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.margin}px;
  padding-bottom: ${({ theme }) => theme.margin}px;
  border-bottom: 1px solid ${({ theme }) => theme.colorBorderSecondary};

`

const UserAvatar = styled(Avatar)`
  flex: none;
  background: ${({ theme }) => theme.colorPrimaryBg};
  color: ${({ theme }) => theme.colorPrimaryText};
  font-weight: 600;
`

const Facts = styled.dl`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.marginXS}px;
  margin: ${({ theme }) => theme.margin}px 0;
`

const Fact = styled.div`
  display: flex;
  justify-content: space-between;
  color: ${({ theme }) => theme.colorTextSecondary};

  dd {
    margin: 0;
    color: ${({ theme }) => theme.colorText};
    font-weight: 600;
  }
`

const Name = styled.div`
  font-size: ${({ theme }) => theme.fontSizeHeading4}px;
  font-weight: 600;
  line-height: ${({ theme }) => theme.lineHeightHeading4};
`
