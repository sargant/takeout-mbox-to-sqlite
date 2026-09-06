import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

import { openDatabase } from './db.js';

const databasePath = resolve('db/emails.sqlite3');
mkdirSync(dirname(databasePath), { recursive: true });

const db = openDatabase(databasePath);
const { user_version: version } = db.prepare('PRAGMA user_version').get();
db.close();

console.log(`Initialized ${databasePath} (schema v${version})`);
