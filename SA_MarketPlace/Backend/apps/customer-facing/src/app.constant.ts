export const APP_NAME = 'customer-facing'

/** Each app owns its port: customer 8001, supplier 8002, admin 8003. */
export const APP_PORT = 8001

/** With URI versioning this produces routes like /api/customer/v1/... */
export const API_PREFIX = 'api/customer/v'

/** Swagger UI, development only. Kept outside API_PREFIX so docs never look like a route. */
export const SWAGGER_PATH = 'docs'

export const BODY_SIZE_LIMIT = '1mb'

export const DEFAULT_TIMEZONE = 'Australia/Sydney'
