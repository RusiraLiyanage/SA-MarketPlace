import { useSearchParams } from 'react-router'
import { parseOrdersQuery, toOrdersSearchParams, type OrdersQuery } from 'src/pages/Orders/ordersQuery'

// Reads the orders list's query from the address. Changing a filter, the search or the sort goes back to page 1;
// pass `page` (or `limit`) explicitly to move within the results.
export const useOrdersQuery = () => {
  const [params, setParams] = useSearchParams()
  const query = parseOrdersQuery(params)

  const update = (changes: Partial<OrdersQuery>) => {
    const movesWithinResults = 'page' in changes || 'limit' in changes
    setParams(toOrdersSearchParams({ ...query, ...(movesWithinResults ? {} : { page: 1 }), ...changes }))
  }

  const clear = () => setParams(new URLSearchParams())

  return { query, update, clear }
}
