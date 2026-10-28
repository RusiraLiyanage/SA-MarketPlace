import styled from 'styled-components'

// The white card every part of the profile page sits in.
const ProfileCard = styled.section`
  padding: ${({ theme }) => theme.padding}px;
  background: ${({ theme }) => theme.colorBgContainer};
  border-radius: ${({ theme }) => theme.borderRadiusLG}px;
`

export default ProfileCard
