export const APP_NAME = 'admin-api'

/** Each app owns its port (ADR 0016): customer 8001, supplier 8002, admin 8003. */
export const APP_PORT = 8003

/** With URI versioning this produces routes like /api/admin/v1/... */
export const API_PREFIX = 'api/admin/v'

/** Swagger UI, development only. Kept outside API_PREFIX so docs never look like a route. */
export const SWAGGER_PATH = 'docs'

export const BODY_SIZE_LIMIT = '1mb'
