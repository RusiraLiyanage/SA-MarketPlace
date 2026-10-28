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
  UsersService,
} from '@sa-marketplace/auth'
import { UserRoleType } from '@sa-marketplace/entities'
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
    private readonly usersService: UsersService,
  ) {}

  // Only for allowed Sample Assist email domains (ADR 0038). Rate limited per IP.
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
  async login(@Req() req: AuthRequest) {
    // Only reached once the password has checked out, so failed attempts record nothing.
    await this.usersService.recordSignIn(req.user.userId)
    return await this.authService.login(req.user)
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

  // Invalidates every token issued to this admin so far (ADR 0018).
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @Post('logout')
  logout(@Req() req: AuthRequest) {
    return this.authService.logout(req.user.userId)
  }

  // Admins only, whatever else the token says; userId comes from the token (§7).
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRoleType.admin)
  @ApiBearerAuth()
  @Get('profile')
  getProfile(@Req() req: AuthRequest) {
    return this.profileService.getMyProfile(req.user.userId)
  }

  // The name only; never email, role or password (ADR 0028).
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRoleType.admin)
  @ApiBearerAuth()
  @Patch('profile')
  updateProfile(@Req() req: AuthRequest, @Body() dto: UpdateProfileDto) {
    return this.profileService.updateMyProfile(req.user.userId, dto)
  }

  // The token alone authorizes it (no current password, ADR 0030); rate limited. Returns a fresh
  // token so this session survives its own change, and signs out every other one.
  @UseGuards(ThrottlerGuard, JwtAuthGuard, RolesGuard)
  @Roles(UserRoleType.admin)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.OK)
  @Post('change-password')
  changePassword(@Req() req: AuthRequest, @Body() dto: ChangePasswordDto) {
    return this.authService.changePassword(req.user.userId, dto.newPassword)
  }
}
