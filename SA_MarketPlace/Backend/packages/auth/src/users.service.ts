import { Injectable } from '@nestjs/common'
import { InjectRepository } from '@nestjs/typeorm'
import { User, UserRole, UserRoleType } from '@sa-marketplace/entities'
import { EntityManager, Repository } from 'typeorm'

export interface CreateUserData {
  email: string
  passwordHash: string
  passwordLength: number
  firstName: string
  lastName: string
  phone?: string
  organisationId?: string
  /** Set by apps whose sign-up asks the user to accept the terms. */
  termsAcceptedAt?: Date
}

// Deliberately narrow: no identity or security fields (email, passwordHash, status...), ADR 0028.
export interface UpdatableProfileFields {
  firstName?: string
  lastName?: string
  phone?: string
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly userRepository: Repository<User>,
    @InjectRepository(UserRole)
    private readonly userRoleRepository: Repository<UserRole>,
  ) {}

  // Emails are stored lowercased (ADR 0011), so lookups must be too.
  findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { email: email.trim().toLowerCase() },
    })
  }

  findById(id: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { id } })
  }

  // A miss is a data-integrity bug: JwtStrategy already confirmed this id is a real, active user.
  findByIdOrFail(id: string): Promise<User> {
    return this.userRepository.findOneByOrFail({ id })
  }

  async getRoles(userId: string): Promise<UserRoleType[]> {
    const userRoles = await this.userRoleRepository.find({ where: { userId } })
    return userRoles.map((userRole) => userRole.role)
  }

  // Takes a manager so apps can add their own rows in the same transaction.
  async createUser(
    manager: EntityManager,
    data: CreateUserData,
    role: UserRoleType,
  ): Promise<User> {
    const user = await manager.save(
      manager.create(User, {
        ...data,
        email: data.email.trim().toLowerCase(),
        phone: data.phone ?? null,
        organisationId: data.organisationId ?? null,
        termsAcceptedAt: data.termsAcceptedAt ?? null,
      }),
    )
    await manager.save(manager.create(UserRole, { userId: user.id, role }))
    return user
  }

  // Stamps now as the latest sign-in. Called by the apps that show it (ADR 0039).
  async recordSignIn(userId: string): Promise<void> {
    await this.userRepository.update(
      { id: userId },
      { lastSignInAt: new Date() },
    )
  }

  async incrementTokenVersion(userId: string): Promise<void> {
    await this.userRepository.increment({ id: userId }, 'tokenVersion', 1)
  }

  // A field left out of `fields` is left unchanged — true PATCH semantics.
  async updateProfile(
    userId: string,
    fields: UpdatableProfileFields,
  ): Promise<void> {
    await this.userRepository.update({ id: userId }, fields)
  }

  // Only writer of passwordHash outside registration; kept apart from updateProfile (ADR 0028).
  // passwordLength always travels with passwordHash — see User entity.
  async updatePasswordHash(
    userId: string,
    passwordHash: string,
    passwordLength: number,
  ): Promise<void> {
    await this.userRepository.update(
      { id: userId },
      { passwordHash, passwordLength },
    )
  }
}
