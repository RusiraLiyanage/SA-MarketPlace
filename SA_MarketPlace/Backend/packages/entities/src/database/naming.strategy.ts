import { SnakeNamingStrategy } from 'typeorm-naming-strategies'

/**
 * snake_case tables and columns (DATABASE.md §5), mapped in one place instead of per `@Column`.
 * Both database entry points MUST use it, or the CLI and the app disagree on column names.
 */
export class SaNamingStrategy extends SnakeNamingStrategy {}
