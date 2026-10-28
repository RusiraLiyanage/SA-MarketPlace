import { useSearchParams } from 'react-router'
import { parseShopQuery, toSearchParams, type ShopQuery } from 'src/pages/Shop/shopQuery'

// Reads the catalogue query from the URL. Changing a filter, the search or the sort goes back to page 1;
// pass `page` (or `limit`) explicitly to move within the results.
export const useShopQuery = () => {
  const [params, setParams] = useSearchParams()
  const query = parseShopQuery(params)

  const update = (changes: Partial<ShopQuery>) => {
    const movesWithinResults = 'page' in changes || 'limit' in changes
    setParams(toSearchParams({ ...query, ...(movesWithinResults ? {} : { page: 1 }), ...changes }))
  }

  const clear = () => setParams(new URLSearchParams())

  return { query, update, clear }
}
