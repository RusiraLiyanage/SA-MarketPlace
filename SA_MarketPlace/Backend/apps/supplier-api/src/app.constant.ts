export const APP_NAME = 'supplier-api'

/** Each app owns its port (ADR 0016): customer 8001, supplier 8002, admin 8003. */
export const APP_PORT = 8002

/** With URI versioning this produces routes like /api/supplier/v1/... */
export const API_PREFIX = 'api/supplier/v'

/** Swagger UI, development only. Kept outside API_PREFIX so docs never look like a route. */
export const SWAGGER_PATH = 'docs'

export const BODY_SIZE_LIMIT = '1mb'
