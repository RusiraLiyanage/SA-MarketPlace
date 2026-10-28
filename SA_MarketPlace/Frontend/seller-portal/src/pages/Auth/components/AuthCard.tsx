import styled from 'styled-components'

// The white card on the grey page that every auth page puts its form in.
const AuthCard = styled.div`
  padding: ${({ theme }) => theme.paddingLG}px;
  background: ${({ theme }) => theme.colorBgContainer};
  border-radius: ${({ theme }) => theme.borderRadiusLG}px;
`

export default AuthCard
