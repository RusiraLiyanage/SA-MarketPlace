import * as path from 'path'

// Backend/storage, 5 levels up from dist/modules/storage. Local runtime output (gitignored).
export const STORAGE_ROOT = path.resolve(__dirname, '../../../../../storage')
