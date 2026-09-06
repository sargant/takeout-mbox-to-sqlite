import { createReadStream, mkdirSync, readdirSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { openDatabase } from './db.js';

const mboxDir = fileURLToPath(new URL('../mbox/', import.meta.url));
const dbPath = fileURLToPath(new URL('../db/emails.sqlite3', import.meta.url));
const separator = /^From \d+@xxx (?:Mon|Tue|Wed|Thu|Fri|Sat|Sun) [A-Z][a-z]{2}\s+\d{1,2} \d{2}:\d{2}:\d{2} [+-]\d{4} \d{4}$/;

async function* lines(path) {
  let pending = Buffer.alloc(0);
  for await (const chunk of createReadStream(path)) {
    const data = pending.length ? Buffer.concat([pending, chunk]) : chunk;
    let start = 0;
    for (let end = data.indexOf(10, start); end !== -1; end = data.indexOf(10, start)) {
      yield data.subarray(start, end + 1);
      start = end + 1;
    }
    pending = data.subarray(start);
  }
  if (pending.length) yield pending;
}

async function importFile(path, db) {
  const insert = db.prepare('INSERT OR IGNORE INTO RawMessages (id, raw) VALUES (?, ?)');
  let id;
  let raw = [];
  let size = 0;
  let processed = 0;
  let inserted = 0;

  const flush = () => {
    if (!id) return;
    inserted += Number(insert.run(id, Buffer.concat(raw, size)).changes);
    processed += 1;
  };

  db.exec('BEGIN IMMEDIATE');
  try {
    for await (const line of lines(path)) {
      const text = line.toString('ascii').replace(/\r?\n$/, '');
      if (separator.test(text)) {
        flush();
        id = text.slice(5);
        raw = [];
        size = 0;
      } else {
        if (!id) throw new Error(`Invalid Gmail Takeout mbox: ${basename(path)}`);
        raw.push(line);
        size += line.length;
      }
    }
    flush();
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }

  return { processed, inserted };
}

mkdirSync(mboxDir, { recursive: true });
mkdirSync(dirname(dbPath), { recursive: true });

const files = readdirSync(mboxDir, { withFileTypes: true })
  .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.mbox'))
  .map((entry) => join(mboxDir, entry.name))
  .sort();

const db = openDatabase(dbPath);
try {
  for (const file of files) {
    console.log(`Importing ${basename(file)}...`);
    const { processed, inserted } = await importFile(file, db);
    console.log(`  ${processed} processed, ${inserted} inserted, ${processed - inserted} already present`);
  }
} finally {
  db.close();
}
