import { readdirSync, readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';

const migrationsDir = fileURLToPath(new URL('../migrations/', import.meta.url));

export function migrateDatabase(db) {
  const { user_version: currentVersion } = db.prepare('PRAGMA user_version').get();

  const migrations = readdirSync(migrationsDir)
    .filter((file) => /^\d+_.+\.sql$/.test(file))
    .map((file) => ({
      file,
      version: Number.parseInt(file, 10),
    }))
    .sort((a, b) => a.version - b.version);

  for (const migration of migrations) {
    if (migration.version <= currentVersion) continue;

    const sql = readFileSync(new URL(`../migrations/${migration.file}`, import.meta.url), 'utf8');

    db.exec('BEGIN IMMEDIATE');
    try {
      db.exec(sql);
      db.exec(`PRAGMA user_version = ${migration.version}`);
      db.exec('COMMIT');
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    }
  }
}

export function openDatabase(path) {
  const db = new DatabaseSync(path);
  migrateDatabase(db);
  return db;
}
