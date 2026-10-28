import { useLocation, useNavigate } from 'react-router'

// For a modal that is a child route: closing goes back up to the page it opened over, keeping the page's query (a filtered,
// sorted, paged list stays as the seller left it).
export const useRouteModal = () => {
  const navigate = useNavigate()
  const { search } = useLocation()
  return { close: () => navigate({ pathname: '..', search }) }
}
