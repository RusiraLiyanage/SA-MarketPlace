import 'reflect-metadata'
import * as path from 'path'
import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { NestFactory } from '@nestjs/core'
import { DataSource } from 'typeorm'
import { DatabaseModule } from './database.module'
import { Order, Product, User } from '../entities'
import { ListingStatus, SupplierStatus, UserRoleType } from '../enums'

/**
 * Smoke-checks that entity mapping (naming, enums, relations) works against a migrated, seeded DB.
 * Run: pnpm --filter @sa-marketplace/entities db:check
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: path.resolve(__dirname, '../../../../.env'),
    }),
    DatabaseModule.forRoot(),
  ],
})
class BootCheckModule {}

const assert = (label: string, ok: boolean, detail: string): boolean => {
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label} — ${detail}`)
  return ok
}

async function check(): Promise<void> {
  const app = await NestFactory.createApplicationContext(BootCheckModule, {
    logger: ['error', 'warn'],
  })
  const results: boolean[] = []

  try {
    const dataSource = app.get(DataSource)
    const [{ database, server_version }] = await dataSource.query(
      'SELECT current_database() AS database, current_setting($1) AS server_version',
      ['server_version'],
    )

    console.log(`DatabaseModule booted and connected.`)
    console.log(
      `  database ${database} · postgres ${server_version} · entities ${dataSource.entityMetadatas.length} · synchronize ${dataSource.options.synchronize}\n`,
    )

    // 1. naming strategy + relations: one user, two roles
    const jordan = await dataSource.getRepository(User).findOne({
      where: { email: 'j.shaw@saclinics.com.au' },
      relations: { organisation: true },
    })
    const roles = await dataSource.query(
      'SELECT role FROM user_role r JOIN "user" u ON u.id = r.user_id WHERE u.email = $1 ORDER BY role',
      ['j.shaw@saclinics.com.au'],
    )
    results.push(
      assert(
        'naming strategy maps camelCase to snake_case',
        jordan?.firstName === 'Jordan',
        `firstName=${jordan?.firstName} lastName=${jordan?.lastName}`,
      ),
    )
    results.push(
      assert(
        'relation resolves through the FK',
        jordan?.organisation?.name === 'SA Clinics Pty Ltd',
        `organisation=${jordan?.organisation?.name}`,
      ),
    )
    results.push(
      assert(
        'one account holds two roles',
        roles.length === 2,
        roles.map((r: { role: UserRoleType }) => r.role).join(', '),
      ),
    )

    // 2. enums deserialise, nested relations resolve
    const product = await dataSource.getRepository(Product).findOne({
      where: { sku: 'UCK-001' },
      relations: { supplierProfile: true, category: true },
    })
    results.push(
      assert(
        'enum column deserialises',
        product?.listingStatus === ListingStatus.published,
        `listingStatus=${product?.listingStatus}`,
      ),
    )
    results.push(
      assert(
        'nested relations resolve',
        product?.supplierProfile?.status === SupplierStatus.approved &&
          product?.category?.name === 'Collection Kits',
        `supplier=${product?.supplierProfile?.businessName} category=${product?.category?.name}`,
      ),
    )

    // 3. numeric arrives as string, not a lossy float
    results.push(
      assert(
        'numeric(10,2) maps to string, not number',
        typeof product?.price === 'string' && product?.price === '24.99',
        `typeof price=${typeof product?.price} value=${product?.price}`,
      ),
    )

    // 4. frozen order lines
    const order = await dataSource.getRepository(Order).findOne({
      where: { orderNumber: 'ORD-2026-00125' },
      relations: { supplierProfile: true },
    })
    const items = await dataSource.query(
      'SELECT sku, unit_price_at_purchase FROM order_item oi JOIN "order" o ON o.id = oi.order_id WHERE o.order_number = $1 ORDER BY sku',
      ['ORD-2026-00125'],
    )
    results.push(
      assert(
        'multi-line order loads with its supplier',
        items.length === 2 &&
          order?.supplierProfile?.businessName === 'Bindi MedSupply Pty Ltd',
        `${items.length} lines, supplier=${order?.supplierProfile?.businessName}`,
      ),
    )
    results.push(
      assert(
        'money totals are strings',
        typeof order?.total === 'string' && order?.total === '163.00',
        `typeof total=${typeof order?.total} value=${order?.total}`,
      ),
    )
  } finally {
    await app.close()
  }

  const failed = results.filter((r) => !r).length
  console.log(`\n${results.length - failed}/${results.length} checks passed.`)
  if (failed > 0) {
    process.exit(1)
  }
}

check().catch((error) => {
  console.error('DatabaseModule failed to boot:', error)
  process.exit(1)
})
