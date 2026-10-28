import styled from 'styled-components'
import SASkeleton from 'src/components/SASkeleton'

// Shown while the app's first page is loading: the outline of a page rather than a spinner, so the layout does not
// jump when the real page arrives.
const SASplashScreen = () => (
  <Page>
    <SASkeleton rows={3} />
    <SASkeleton rows={4} />
  </Page>
)

export default SASplashScreen

const Page = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.marginLG}px;
  max-width: 1200px;
  margin: 0 auto;
  padding: ${({ theme }) => theme.paddingXL}px ${({ theme }) => theme.paddingLG}px;
`
