import { sql } from "drizzle-orm"
import { db } from "../db"

const g = (t: string) => `\x1b[32m${t}\x1b[0m` // green
const r = (t: string) => `\x1b[31m${t}\x1b[0m` // red
const b = (t: string) => `\x1b[1m${t}\x1b[0m` // bold
const d = (t: string) => `\x1b[90m${t}\x1b[0m` // dim
const c = (t: string) => `\x1b[36m${t}\x1b[0m` // cyan

const LINE = "─".repeat(52)

export async function logStartup(port: string | number): Promise<void> {
  console.log(`\n${b(LINE)}`)
  console.log(`${b("  🚀 Bitespeed Identity Service — Starting Up")}`)
  console.log(`${b(LINE)}\n`)

  // ── Environment ─────────────────────────────────────────────────────────
  console.log(`${b("  Environment")}`)
  console.log(
    `  ${d("•")} NODE_ENV      : ${c(process.env.NODE_ENV ?? "development")}`,
  )
  console.log(`  ${d("•")} PORT          : ${c(String(port))}`)
  console.log(`  ${d("•")} Started at    : ${c(new Date().toISOString())}\n`)

  // ── Database ─────────────────────────────────────────────────────────────
  console.log(`${b("  Database")}`)
  try {
    const result = await db.execute(
      sql`SELECT version(), current_database(), current_user, pg_postmaster_start_time() AS uptime`,
    )
    const row = result[0] as {
      version: string
      current_database: string
      current_user: string
      uptime: Date
    }

    const pgVersion = row.version.split(",")[0]
    const maskedUrl = (process.env.DATABASE_URL ?? "").replace(
      /:\/\/.*@/,
      "://****:****@",
    )

    console.log(`  ${g("✔")} Status        : ${g("Connected")}`)
    console.log(`  ${d("•")} Version       : ${c(pgVersion)}`)
    console.log(`  ${d("•")} Database      : ${c(row.current_database)}`)
    console.log(`  ${d("•")} User          : ${c(row.current_user)}`)
    console.log(
      `  ${d("•")} DB Uptime     : ${c(new Date(row.uptime).toLocaleString())}`,
    )
    console.log(`  ${d("•")} URL           : ${c(maskedUrl)}\n`)
  } catch (err: any) {
    console.log(`  ${r("✖")} Status        : ${r("Connection FAILED")}`)
    console.log(`  ${r("  Reason        :")} ${err?.message ?? String(err)}\n`)
    console.log(
      `${r(b("  ⚠  Shutting down — cannot start without database."))}\n`,
    )
    process.exit(1)
  }

  // ── Routes ───────────────────────────────────────────────────────────────
  console.log(`${b("  Registered Routes")}`)
  console.log(`  ${d("•")} POST          : ${c("/identify")}`)
  console.log(`  ${d("•")} GET           : ${c("/health")}\n`)
}

export function logServerReady(port: string | number): void {
  const b = (t: string) => `\x1b[1m${t}\x1b[0m`
  console.log(`${b(LINE)}`)
  console.log(`${b(`  ✅  Server ready → http://localhost:${port}`)}`)
  console.log(`${b(LINE)}\n`)
}

export function logRequest(method: string, path: string): void {
  const d = (t: string) => `\x1b[90m${t}\x1b[0m`
  const c = (t: string) => `\x1b[36m${t}\x1b[0m`
  console.log(
    `${d(`[${new Date().toISOString()}]`)} ${c(method.padEnd(6))} ${path}`,
  )
}
