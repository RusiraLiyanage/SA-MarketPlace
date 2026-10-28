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
} from '@sa-marketplace/auth'
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

  // LocalAuthGuard checks the password first and puts the user on req.user.
  // ThrottlerGuard first: a blocked request never reaches the password check.
  @UseGuards(ThrottlerGuard, LocalAuthGuard)
  @ApiBody({ type: LoginDto })
  @HttpCode(HttpStatus.OK)
  @Post('login')
  login(@Req() req: AuthRequest) {
    return this.authService.login(req.user)
  }

  // Same response whether or not the email exists: no user enumeration (ADR 0029). Rate limited.
  @UseGuards(ThrottlerGuard)
  @HttpCode(HttpStatus.OK)
  @Post('forgot-password')
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto.email)
  }

  // Single use — a token cannot be replayed even within its TTL (ADR 0029).
  @UseGuards(ThrottlerGuard)
  @HttpCode(HttpStatus.OK)
  @Post('reset-password')
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.token, dto.password)
  }

  // Never the password or hash; passwordLength lets the UI size its dots.
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Get('profile')
  getProfile(@Req() req: AuthRequest) {
    return this.profileService.getMyProfile(req.user.userId)
  }

  // firstName/lastName/phone only. Never email, password or organisation —
  // see UpdatableProfileFields' own comment (ADR 0028).
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Patch('profile')
  updateProfile(@Req() req: AuthRequest, @Body() dto: UpdateProfileDto) {
    return this.profileService.updateMyProfile(req.user.userId, dto)
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @Post('logout')
  logout(@Req() req: AuthRequest) {
    return this.authService.logout(req.user.userId)
  }

  // Authenticated change (no current-password field, ADR 0030). Returns a fresh token so this
  // session survives its own tokenVersion bump; every other session is evicted.
  @UseGuards(ThrottlerGuard, JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @Post('change-password')
  changePassword(@Req() req: AuthRequest, @Body() dto: ChangePasswordDto) {
    return this.authService.changePassword(req.user.userId, dto.newPassword)
  }
}
