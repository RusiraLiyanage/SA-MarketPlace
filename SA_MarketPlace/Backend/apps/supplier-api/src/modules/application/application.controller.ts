import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger'
import {
  AuthRequest,
  JwtAuthGuard,
  Roles,
  RolesGuard,
} from '@sa-marketplace/auth'
import { UserRoleType } from '@sa-marketplace/entities'
import { ApplicationService } from './application.service'
import { ApplicationDetails, ApplicationView } from './application.typing'
import { ResubmitApplicationDto } from './dto/resubmit-application.dto'

// On the class so no route is missed; pending/rejected sellers are allowed (they see their status).
// The seller always comes from req.user.userId (§7).
@ApiTags('Application')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRoleType.seller)
@Controller({ path: 'application', version: '1' })
export class ApplicationController {
  constructor(private readonly applicationService: ApplicationService) {}

  @Get()
  @ApiOperation({
    summary: 'Application status: under review, rejected, or approved',
  })
  getMyApplication(@Req() req: AuthRequest): Promise<ApplicationView> {
    return this.applicationService.getMyApplication(req.user.userId)
  }

  @Post('acknowledge')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Dismiss the approval notice ("Proceed to dashboard"), once',
  })
  acknowledgeApproval(@Req() req: AuthRequest): Promise<void> {
    return this.applicationService.acknowledgeApproval(req.user.userId)
  }

  @Get('details')
  @ApiOperation({
    summary: 'Pre-fill data for "Update and resubmit" (rejected only)',
  })
  getResubmissionDetails(@Req() req: AuthRequest): Promise<ApplicationDetails> {
    return this.applicationService.getResubmissionDetails(req.user.userId)
  }

  @Put()
  @ApiOperation({
    summary: 'Update and resubmit a rejected application for review',
  })
  resubmit(
    @Req() req: AuthRequest,
    @Body() dto: ResubmitApplicationDto,
  ): Promise<ApplicationView> {
    return this.applicationService.resubmit(req.user.userId, dto)
  }
}
