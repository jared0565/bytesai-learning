/**
 * Local development D1 adapter.
 * Wraps Node.js built-in `node:sqlite` (available in Node 22.5+) to match
 * the Cloudflare D1 interface used throughout the codebase.
 *
 * Only loaded in local dev via src/instrumentation.ts — never in production.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import { DatabaseSync } from 'node:sqlite';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

type D1Value = string | number | boolean | null | ArrayBuffer;

class LocalStatement {
  private db: DatabaseSync;
  private sql: string;
  private bindings: D1Value[];

  constructor(db: DatabaseSync, sql: string, bindings: D1Value[] = []) {
    this.db = db;
    this.sql = sql;
    this.bindings = bindings;
  }

  bind(...values: D1Value[]): LocalStatement {
    return new LocalStatement(this.db, this.sql, values);
  }

  async first<T>(): Promise<T | null> {
    try {
      const stmt = this.db.prepare(this.sql);
      const row = stmt.get(...(this.bindings as any[])) as T | undefined;
      return row ?? null;
    } catch (e) {
      console.error('[local-d1] first() error:', e, '\nSQL:', this.sql);
      throw e;
    }
  }

  async all<T>(): Promise<{ results: T[]; success: boolean; meta: object }> {
    try {
      const stmt = this.db.prepare(this.sql);
      const rows = stmt.all(...(this.bindings as any[])) as T[];
      return { results: rows, success: true, meta: {} };
    } catch (e) {
      console.error('[local-d1] all() error:', e, '\nSQL:', this.sql);
      throw e;
    }
  }

  async run(): Promise<{ success: boolean; meta: object }> {
    try {
      const stmt = this.db.prepare(this.sql);
      stmt.run(...(this.bindings as any[]));
      return { success: true, meta: {} };
    } catch (e) {
      console.error('[local-d1] run() error:', e, '\nSQL:', this.sql);
      throw e;
    }
  }
}

class LocalD1Database {
  private db: DatabaseSync;

  constructor(db: DatabaseSync) {
    this.db = db;
  }

  prepare(sql: string): LocalStatement {
    return new LocalStatement(this.db, sql);
  }

  async batch<T>(statements: LocalStatement[]): Promise<Array<{ results: T[]; success: boolean; meta: object }>> {
    return Promise.all(statements.map(s => s.all<T>()));
  }

  // Expose for direct exec (schema bootstrap)
  exec(sql: string) {
    this.db.exec(sql);
  }
}

export async function setupLocalDB(): Promise<void> {
  const cwd = process.cwd();
  const dbPath = join(cwd, '.local-dev.db');
  const schemaPath = join(cwd, 'db', 'schema.sql');

  const isNew = !existsSync(dbPath);
  const db = new DatabaseSync(dbPath);

  db.exec('PRAGMA journal_mode = WAL');
  db.exec('PRAGMA foreign_keys = ON');

  // Always apply schema (IF NOT EXISTS guards are in schema.sql)
  if (existsSync(schemaPath)) {
    const schema = readFileSync(schemaPath, 'utf8');
    db.exec(schema);
  }

  // Seed providers + courses if this is a fresh DB
  if (isNew) {
    const seedFiles = [
      join(cwd, 'db', 'seed', 'providers.sql'),
      join(cwd, 'db', 'seed', 'courses.sql'),
      join(cwd, 'db', 'seed', 'featured.sql'),
    ];
    for (const f of seedFiles) {
      if (existsSync(f)) {
        try {
          db.exec(readFileSync(f, 'utf8'));
        } catch (e) {
          // Some seed files may have conflicts on re-run — safe to ignore
          console.warn('[local-d1] Seed warning:', (e as Error).message?.slice(0, 80));
        }
      }
    }
    console.log('[local-d1] 🌱 Database seeded with providers and courses');
  }

  const localD1 = new LocalD1Database(db);
  (globalThis as Record<string, unknown>).DB = localD1;

  console.log(`[local-d1] ✅ Local SQLite DB ready${isNew ? ' (new)' : ''}: .local-dev.db`);
}
