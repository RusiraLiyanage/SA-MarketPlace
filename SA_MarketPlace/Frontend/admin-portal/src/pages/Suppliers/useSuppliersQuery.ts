import { useSearchParams } from 'react-router'
import { parseSuppliersQuery, toSuppliersSearchParams, type SuppliersQuery } from 'src/pages/Suppliers/suppliersQuery'

// Reads the queue's query from the address. Changing the search or the status goes back to page 1;
// pass `page` (or `limit`) explicitly to move within the results.
export const useSuppliersQuery = () => {
  const [params, setParams] = useSearchParams()
  const query = parseSuppliersQuery(params)

  const update = (changes: Partial<SuppliersQuery>) => {
    const movesWithinResults = 'page' in changes || 'limit' in changes
    setParams(toSuppliersSearchParams({ ...query, ...(movesWithinResults ? {} : { page: 1 }), ...changes }))
  }

  // "Clear filters" shows everyone, which is what a search that found nothing needs.
  const clear = () => setParams(toSuppliersSearchParams({ ...query, search: '', status: 'all', page: 1 }))

  return { query, update, clear }
}
