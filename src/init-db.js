import { resolve } from 'node:path';

import { openDatabase } from './db.js';

const databasePath = process.argv[2];

if (!databasePath) {
  console.error('Usage: npm run db:init -- <database>');
  process.exit(1);
}

const resolvedPath = resolve(databasePath);
const db = openDatabase(resolvedPath);
const { user_version: version } = db.prepare('PRAGMA user_version').get();
db.close();

console.log(`Initialized ${resolvedPath} (schema v${version})`);
