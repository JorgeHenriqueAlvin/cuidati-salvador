import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

export function openDB(directory = process.env.DATA_DIR || './data') {
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  const db = new DatabaseSync(resolve(directory, 'cuidati.sqlite'));
  db.exec(`PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;
    CREATE TABLE IF NOT EXISTS admins (id INTEGER PRIMARY KEY, email TEXT NOT NULL UNIQUE, salt TEXT NOT NULL, hash TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, admin_id INTEGER NOT NULL REFERENCES admins(id) ON DELETE CASCADE, expires INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS limits (bucket TEXT PRIMARY KEY, hits INTEGER NOT NULL, expires INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS challenges (token TEXT PRIMARY KEY, answer TEXT NOT NULL, created INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS leads (
      id TEXT PRIMARY KEY, request_id TEXT NOT NULL UNIQUE, name TEXT NOT NULL, company TEXT NOT NULL,
      phone TEXT NOT NULL, neighborhood TEXT NOT NULL, computers INTEGER NOT NULL CHECK(computers > 0),
      difficulty TEXT NOT NULL, interest TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'Novo'
      CHECK(status IN ('Novo','Em contato','Proposta enviada','Convertido','Encerrado')),
      notes TEXT NOT NULL DEFAULT '', created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS clients (
      id TEXT PRIMARY KEY, lead_id TEXT UNIQUE REFERENCES leads(id) ON DELETE SET NULL,
      name TEXT NOT NULL, company TEXT NOT NULL, phone TEXT NOT NULL, neighborhood TEXT NOT NULL,
      computers INTEGER NOT NULL CHECK(computers > 0), service TEXT NOT NULL DEFAULT '',
      monthly_cents INTEGER CHECK(monthly_cents IS NULL OR monthly_cents >= 0),
      status TEXT NOT NULL DEFAULT 'Ativo' CHECK(status IN ('Ativo','Inativo')), created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS visits (
      id TEXT PRIMARY KEY, client_id TEXT NOT NULL REFERENCES clients(id), scheduled_at TEXT NOT NULL,
      description TEXT NOT NULL, status TEXT NOT NULL CHECK(status IN ('Agendada','Realizada','Cancelada')),
      notes TEXT NOT NULL DEFAULT '', next_at TEXT, created_at TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS settings (id INTEGER PRIMARY KEY CHECK(id=1), phone TEXT NOT NULL DEFAULT '', email TEXT NOT NULL DEFAULT '', hours TEXT NOT NULL DEFAULT '');
    INSERT OR IGNORE INTO settings(id) VALUES(1);
  `);
  return db;
}
export function transaction(db, fn) {
  db.exec('BEGIN IMMEDIATE');
  try { const value = fn(); db.exec('COMMIT'); return value; }
  catch (error) { db.exec('ROLLBACK'); throw error; }
}
