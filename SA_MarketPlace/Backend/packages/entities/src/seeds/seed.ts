import * as fs from 'fs'
import * as path from 'path'
import { AppDataSource } from '../database/data-source'

/**
 * Seed runner (DATABASE.md §10): runs seed.sql in one transaction so a failure leaves the DB untouched.
 * It REPLACES the seeded tables, so hand-added rows there are removed.
 */
const SEED_FILE = path.join(__dirname, 'seed.sql')

async function seed(): Promise<void> {
  const sql = fs.readFileSync(SEED_FILE, 'utf8')

  await AppDataSource.initialize()

  const queryRunner = AppDataSource.createQueryRunner()
  await queryRunner.connect()
  await queryRunner.startTransaction()

  try {
    await queryRunner.query(sql)
    await queryRunner.commitTransaction()
    console.log('Seed applied successfully.')
  } catch (error) {
    await queryRunner.rollbackTransaction()
    throw error
  } finally {
    await queryRunner.release()
    await AppDataSource.destroy()
  }
}

seed().catch((error) => {
  console.error('Seed failed:', error)
  process.exit(1)
})
