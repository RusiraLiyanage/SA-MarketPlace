import { OmitType } from '@nestjs/swagger'
import { RegisterDto } from '../../auth/dto/register.dto'

// Registration fields minus email (needs re-verification, CLAUDE.md §9.7) and password
// (own endpoint, ADR 0028, 0030); sending either is rejected as unknown.
export class ResubmitApplicationDto extends OmitType(RegisterDto, [
  'email',
  'password',
] as const) {}
