import { Avatar, Typography } from 'antd'
import styled from 'styled-components'
import { roleLabels } from 'src/store/profile/selector'
import type { MyAdminProfile } from 'src/store/profile/types'
import { formatMonthYear, formatWhen, initials } from 'src/utils/format'

// Who is signed in: their initials, name and role, when the account began and when it last signed in.
const SummaryCard = ({ profile }: { profile: MyAdminProfile }) => {
  const names = profile.fullName.split(/\s+/)

  return (
    <Card aria-label="Profile summary">
      <Identity>
        <UserAvatar size={56}>{initials(names[0] ?? '', names[names.length - 1] ?? '')}</UserAvatar>
        <div>
          <Name>{profile.fullName}</Name>
          <Typography.Text type="secondary">{roleLabels(profile.roles)} · Sample Assist</Typography.Text>
        </div>
      </Identity>
      <Facts>
        <Fact>
          <dt>Admin since</dt>
          <dd>{formatMonthYear(profile.memberSince)}</dd>
        </Fact>
        <Fact>
          <dt>Last sign-in</dt>
          <dd>{profile.lastSignInAt ? formatWhen(profile.lastSignInAt) : 'Not recorded yet'}</dd>
        </Fact>
      </Facts>
    </Card>
  )
}

export default SummaryCard

const Card = styled.section`
  padding: ${({ theme }) => theme.padding}px ${({ theme }) => theme.paddingLG}px;
  background: ${({ theme }) => theme.colorBgContainer};
  border-radius: ${({ theme }) => theme.borderRadiusLG}px;
`

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

const Name = styled.div`
  font-size: ${({ theme }) => theme.fontSizeHeading4}px;
  font-weight: 600;
  line-height: ${({ theme }) => theme.lineHeightHeading4};
`

const Facts = styled.dl`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.marginXS}px;
  margin: ${({ theme }) => theme.margin}px 0 0;
`

const Fact = styled.div`
  display: flex;
  justify-content: space-between;
  gap: ${({ theme }) => theme.margin}px;
  color: ${({ theme }) => theme.colorTextSecondary};

  dd {
    margin: 0;
    color: ${({ theme }) => theme.colorText};
    font-weight: 600;
    text-align: right;
  }
`
