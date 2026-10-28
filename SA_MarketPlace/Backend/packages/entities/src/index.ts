// @sa-marketplace/entities
// TypeORM entities and the database wiring shared across backend services.

// database
export * from './database/database.module'
export * from './database/database.options'
export * from './database/naming.strategy'

// ./database/data-source is NOT exported: it loads .env and throws at import time (CLI only).

// enums
export * from './enums'

// entities
export * from './entities'
