import { execSync } from 'node:child_process'
import postgres from 'postgres'
import { adminUrl } from './db'

async function reachable() {
  const sql = postgres(adminUrl, { max: 1, connect_timeout: 2, onnotice: () => {} })
  try {
    await sql`select 1`
    return true
  } catch {
    return false
  } finally {
    await sql.end()
  }
}

export default async function setup() {
  if (await reachable()) return
  try {
    execSync('docker compose up -d --wait', { cwd: '../..', stdio: 'inherit' })
  } catch {
    throw new Error('Postgres is not running and Docker could not start it. Start Docker, then run pnpm test again.')
  }
}
