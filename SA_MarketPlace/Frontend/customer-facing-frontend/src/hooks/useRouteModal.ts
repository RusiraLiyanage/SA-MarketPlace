import { useNavigate } from 'react-router'

// For a modal that is a child route: closing goes back up to the page it opened over.
export const useRouteModal = () => {
  const navigate = useNavigate()
  return { close: () => navigate('..') }
}
