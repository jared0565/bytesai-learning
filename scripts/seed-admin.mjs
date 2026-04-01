/**
 * Seed an admin user into the local SQLite dev database (.local-dev.db).
 * Run with: npm run db:seed:admin
 *
 * Reads credentials from .env.local:
 *   SEED_ADMIN_EMAIL
 *   SEED_ADMIN_PASSWORD
 *   SEED_ADMIN_NAME
 */

import { DatabaseSync } from 'node:sqlite';
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const envPath = join(root, '.env.local');
const dbPath = join(root, '.local-dev.db');
const schemaPath = join(root, 'db', 'schema.sql');

// ─── Load .env.local ──────────────────────────────────────────────────────────
if (!existsSync(envPath)) {
  console.error('❌  .env.local not found. Create it first (copy from .env.local.example).');
  process.exit(1);
}

const env = Object.fromEntries(
  readFileSync(envPath, 'utf8')
    .split('\n')
    .filter(l => l.trim() && !l.trim().startsWith('#'))
    .map(l => { const idx = l.indexOf('='); return [l.slice(0, idx).trim(), l.slice(idx + 1).trim()]; })
    .filter(([k]) => k)
    .map(([k, v]) => [k, v.replace(/^["']|["']$/g, '')])
);

const email = env.SEED_ADMIN_EMAIL;
const password = env.SEED_ADMIN_PASSWORD;
const name = env.SEED_ADMIN_NAME ?? 'Admin';

if (!email || !password) {
  console.error('❌  SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD must be set in .env.local');
  process.exit(1);
}

// ─── Hash password (same PBKDF2 as auth.ts) ───────────────────────────────────
async function hashPassword(pwd) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(pwd), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations: 100000 }, key, 256);
  const hash = new Uint8Array(bits);
  const combined = new Uint8Array(salt.length + hash.length);
  combined.set(salt);
  combined.set(hash, salt.length);
  return btoa(String.fromCharCode(...combined));
}

const passwordHash = await hashPassword(password);
const now = new Date().toISOString();
const userId = `usr-admin-${Date.now()}`;

// ─── Open / create the local DB ───────────────────────────────────────────────
const db = new DatabaseSync(dbPath);
db.exec('PRAGMA foreign_keys = ON');

// Ensure schema exists
if (existsSync(schemaPath)) {
  db.exec(readFileSync(schemaPath, 'utf8'));
}

// ─── Insert admin ─────────────────────────────────────────────────────────────
console.log(`\n🔧  Seeding admin user...`);
console.log(`    Email:  ${email}`);
console.log(`    Name:   ${name}`);
console.log(`    ID:     ${userId}\n`);

// Remove existing record with same email
db.prepare('DELETE FROM user_profiles WHERE user_id = (SELECT id FROM users WHERE email = ?)').run(email);
db.prepare('DELETE FROM users WHERE email = ?').run(email);

// Insert user
db.prepare(`
  INSERT INTO users (id, email, password_hash, role, email_verified, created_at, updated_at)
  VALUES (?, ?, ?, 'admin', 1, ?, ?)
`).run(userId, email, passwordHash, now, now);

// Insert profile
db.prepare(`
  INSERT INTO user_profiles (user_id, display_name, dark_mode, created_at, updated_at)
  VALUES (?, ?, 0, ?, ?)
`).run(userId, name, now, now);

console.log('✅  Admin user created in .local-dev.db');
console.log(`\n    → Login at: http://localhost:3000/auth/login`);
console.log(`      Email:    ${email}`);
console.log(`      Password: ${password}\n`);
