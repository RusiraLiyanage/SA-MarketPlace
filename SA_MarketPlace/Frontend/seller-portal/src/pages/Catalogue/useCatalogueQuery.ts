import { useSearchParams } from 'react-router'
import { parseCatalogueQuery, toCatalogueSearchParams, type CatalogueQuery } from 'src/pages/Catalogue/catalogueQuery'

// Reads the catalogue's query from the URL. Changing the search, the status or the sort goes back to page 1;
// pass `page` (or `limit`) explicitly to move within the results.
export const useCatalogueQuery = () => {
  const [params, setParams] = useSearchParams()
  const query = parseCatalogueQuery(params)

  const update = (changes: Partial<CatalogueQuery>) => {
    const movesWithinResults = 'page' in changes || 'limit' in changes
    setParams(toCatalogueSearchParams({ ...query, ...(movesWithinResults ? {} : { page: 1 }), ...changes }), {
      // The "retired" banner arrives in the location state; once the seller filters or sorts it has done its job.
      state: undefined,
    })
  }

  const clear = () => setParams(new URLSearchParams())

  return { query, update, clear }
}
