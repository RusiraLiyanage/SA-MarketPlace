import { Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { JwtService } from '@nestjs/jwt'
import { BusinessException, MailService } from '@sa-marketplace/common'
import {
  PasswordResetToken,
  User,
  UserRoleType,
  UserStatus,
} from '@sa-marketplace/entities'
import * as bcrypt from 'bcryptjs'
import { Repository } from 'typeorm'
import { AuthAudience } from './auth.constant'
import { AuthService } from './auth.service'
import { UsersService } from './users.service'

const resetPasswordSetting = {
  envKey: 'TEST_RESET_URL',
  fallback: 'http://localhost:5173/reset-password',
}

describe('AuthService', () => {
  const password = 'Password123!'
  let user: User
  let usersService: jest.Mocked<UsersService>
  let jwtService: JwtService
  let authService: AuthService

  beforeEach(async () => {
    user = {
      id: 'user-1',
      email: 'buyer@example.com',
      passwordHash: await bcrypt.hash(password, 4),
      status: UserStatus.active,
      tokenVersion: 0,
    } as User

    usersService = {
      findByEmail: jest.fn().mockResolvedValue(user),
      getRoles: jest.fn().mockResolvedValue([UserRoleType.buyer]),
    } as unknown as jest.Mocked<UsersService>

    jwtService = new JwtService({
      secret: 'test-secret',
      signOptions: { audience: AuthAudience.customer },
    })
    // Not exercised by these tests — validateUser/login never touch mail,
    // config or the reset-token repository.
    authService = new AuthService(
      usersService,
      jwtService,
      {} as unknown as MailService,
      {} as unknown as ConfigService,
      {} as unknown as Repository<PasswordResetToken>,
      {
        audience: AuthAudience.customer,
        allowedRoles: [UserRoleType.buyer],
        resetPasswordUrl: resetPasswordSetting,
      },
    )
  })

  it('returns the user for the right password', async () => {
    await expect(
      authService.validateUser(user.email, password),
    ).resolves.toEqual({
      userId: 'user-1',
      email: 'buyer@example.com',
      roles: [UserRoleType.buyer],
      tokenVersion: 0,
    })
  })

  it('returns null for a wrong password', async () => {
    await expect(
      authService.validateUser(user.email, 'wrong'),
    ).resolves.toBeNull()
  })

  it('refuses a suspended account', async () => {
    user.status = UserStatus.suspended
    await expect(
      authService.validateUser(user.email, password),
    ).rejects.toBeInstanceOf(BusinessException)
  })

  it('refuses a user without an allowed role', async () => {
    usersService.getRoles.mockResolvedValue([UserRoleType.seller])
    await expect(
      authService.validateUser(user.email, password),
    ).rejects.toMatchObject({ error: 'ECB403' })
  })

  it('signs the token version and audience into the access token', async () => {
    const { access_token } = await authService.login({
      userId: 'user-1',
      email: 'buyer@example.com',
      roles: [UserRoleType.buyer],
      tokenVersion: 3,
    })
    expect(jwtService.verify(access_token)).toMatchObject({
      sub: 'user-1',
      tokenVersion: 3,
      aud: AuthAudience.customer,
    })
  })

  describe('forgotPassword reset link', () => {
    let send: jest.Mock
    let environment: Record<string, string | undefined>
    let errorLog: jest.SpyInstance

    const buildService = () => {
      send = jest.fn()
      const repository = {
        update: jest.fn().mockResolvedValue(undefined),
        insert: jest.fn().mockResolvedValue(undefined),
      } as unknown as Repository<PasswordResetToken>
      return new AuthService(
        usersService,
        jwtService,
        { send } as unknown as MailService,
        {
          get: (key: string, fallback?: string) => environment[key] ?? fallback,
        } as unknown as ConfigService,
        repository,
        {
          audience: AuthAudience.customer,
          allowedRoles: [UserRoleType.buyer],
          resetPasswordUrl: resetPasswordSetting,
        },
      )
    }

    const mailedLink = (): URL => {
      const text = (send.mock.calls[0][0] as { text: string }).text
      const match = text.match(/Choose a new password: (\S+)/)
      if (!match) {
        throw new Error(`No link in: ${text}`)
      }
      return new URL(match[1])
    }

    beforeEach(() => {
      environment = {}
      user.firstName = 'Bea'
      errorLog = jest
        .spyOn(Logger.prototype, 'error')
        .mockImplementation(() => undefined)
    })

    afterEach(() => errorLog.mockRestore())

    it("links to the app's own page from its env var, with the token as a query", async () => {
      environment.TEST_RESET_URL = 'https://seller.example.com/reset-password'

      await buildService().forgotPassword(user.email)

      const link = mailedLink()
      expect(`${link.origin}${link.pathname}`).toBe(
        'https://seller.example.com/reset-password',
      )
      expect(link.searchParams.get('token')).toMatch(/^[a-f0-9]{64}$/)
    })

    it('uses the fallback when the env var is not set', async () => {
      await buildService().forgotPassword(user.email)

      const link = mailedLink()
      expect(`${link.origin}${link.pathname}`).toBe(
        resetPasswordSetting.fallback,
      )
    })

    it("reads only its own env var, not another app's", async () => {
      environment.OTHER_RESET_URL = 'https://other.example.com/reset'
      environment.PASSWORD_RESET_URL = 'https://old.example.com/reset'

      await buildService().forgotPassword(user.email)

      expect(mailedLink().origin).toBe('http://localhost:5173')
    })

    it('keeps a query the configured URL already has, adding the token to it', async () => {
      environment.TEST_RESET_URL = 'https://app.example.com/reset?lang=en'

      await buildService().forgotPassword(user.email)

      const link = mailedLink()
      expect(link.searchParams.get('lang')).toBe('en')
      expect(link.searchParams.get('token')).toMatch(/^[a-f0-9]{64}$/)
      expect(link.toString().match(/\?/g)).toHaveLength(1)
    })

    it.each([
      ['not a url'],
      ['/reset-password'],
      ['localhost:5173/reset'],
      ['ftp://example.com/reset'],
      ['javascript:alert(1)'],
    ])(
      'falls back, logs the mistake and still sends the email for the invalid setting %p',
      async (bad) => {
        environment.TEST_RESET_URL = bad

        await buildService().forgotPassword(user.email)

        expect(send).toHaveBeenCalledTimes(1)
        expect(mailedLink().origin).toBe('http://localhost:5173')
        expect(errorLog).toHaveBeenCalledWith(
          expect.stringContaining('TEST_RESET_URL'),
        )
      },
    )

    it('treats a blank setting as unset', async () => {
      environment.TEST_RESET_URL = ''

      await buildService().forgotPassword(user.email)

      expect(mailedLink().origin).toBe('http://localhost:5173')
      expect(errorLog).not.toHaveBeenCalled()
    })

    it('issues a different token each time', async () => {
      const service = buildService()

      await service.forgotPassword(user.email)
      await service.forgotPassword(user.email)

      const tokens = send.mock.calls.map((call) => {
        const text = (call[0] as { text: string }).text
        return new URL(
          String(text.match(/Choose a new password: (\S+)/)?.[1]),
        ).searchParams.get('token')
      })
      expect(new Set(tokens).size).toBe(2)
    })

    it('sends nothing, and does not fail, for an unknown or suspended account', async () => {
      const service = buildService()
      usersService.findByEmail.mockResolvedValueOnce(null)
      await service.forgotPassword('nobody@example.com')
      user.status = UserStatus.suspended
      await service.forgotPassword(user.email)

      expect(send).not.toHaveBeenCalled()
    })
  })
})
