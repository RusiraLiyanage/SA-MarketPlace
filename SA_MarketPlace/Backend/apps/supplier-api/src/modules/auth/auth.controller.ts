import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common'
import { ApiBearerAuth, ApiBody, ApiTags } from '@nestjs/swagger'
import { ThrottlerGuard } from '@nestjs/throttler'
import {
  AuthRequest,
  AuthService,
  JwtAuthGuard,
  LocalAuthGuard,
  Roles,
  RolesGuard,
} from '@sa-marketplace/auth'
import { UserRoleType } from '@sa-marketplace/entities'
import {
  ApprovedSupplierGuard,
  SupplierRequest,
} from '../../guards/approved-supplier.guard'
import { ChangePasswordDto } from './dto/change-password.dto'
import { ForgotPasswordDto } from './dto/forgot-password.dto'
import { LoginDto } from './dto/login.dto'
import { RegisterDto } from './dto/register.dto'
import { ResetPasswordDto } from './dto/reset-password.dto'
import { UpdateProfileDto } from './dto/update-profile.dto'
import { ProfileService } from './services/profile.service'
import { RegistrationService } from './services/registration.service'

@ApiTags('Auth')
@Controller({ path: 'auth', version: '1' })
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly registrationService: RegistrationService,
    private readonly profileService: ProfileService,
  ) {}

  // Rate limited per IP: sign-up and login are the guessable doors.
  @UseGuards(ThrottlerGuard)
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.registrationService.register(dto)
  }

  // ThrottlerGuard first, so a blocked request skips the password check.
  @UseGuards(ThrottlerGuard, LocalAuthGuard)
  @ApiBody({ type: LoginDto })
  @HttpCode(HttpStatus.OK)
  @Post('login')
  login(@Req() req: AuthRequest) {
    return this.authService.login(req.user)
  }

  // Same response whether or not the email exists (ADR 0029).
  @UseGuards(ThrottlerGuard)
  @HttpCode(HttpStatus.OK)
  @Post('forgot-password')
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto.email)
  }

  // Submitted from the emailed reset link; single use (ADR 0029).
  @UseGuards(ThrottlerGuard)
  @HttpCode(HttpStatus.OK)
  @Post('reset-password')
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.token, dto.password)
  }

  // Invalidates every token issued to this seller so far (ADR 0018).
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @Post('logout')
  logout(@Req() req: AuthRequest) {
    return this.authService.logout(req.user.userId)
  }

  // Approved sellers only: the business profile is part of the approved portal.
  @UseGuards(JwtAuthGuard, RolesGuard, ApprovedSupplierGuard)
  @Roles(UserRoleType.seller)
  @ApiBearerAuth()
  @Get('profile')
  getProfile(@Req() req: SupplierRequest) {
    return this.profileService.getMyProfile(req.user.userId, req.supplier)
  }

  // Business type, contact name, phone, SLA and default carrier only; never email, ABN,
  // business name or password (ADR 0037).
  @UseGuards(JwtAuthGuard, RolesGuard, ApprovedSupplierGuard)
  @Roles(UserRoleType.seller)
  @ApiBearerAuth()
  @Patch('profile')
  updateProfile(@Req() req: SupplierRequest, @Body() dto: UpdateProfileDto) {
    return this.profileService.updateMyProfile(
      req.user.userId,
      req.supplier,
      dto,
    )
  }

  // Open to any signed-in seller, even one still pending. The token alone authorizes it (no
  // current password, ADR 0030); rate limited. Returns a fresh token so this session survives
  // its own change and every other session is evicted.
  @UseGuards(ThrottlerGuard, JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @Post('change-password')
  changePassword(@Req() req: AuthRequest, @Body() dto: ChangePasswordDto) {
    return this.authService.changePassword(req.user.userId, dto.newPassword)
  }
}
