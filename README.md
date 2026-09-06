# takeout-mbox-to-sqlite

Import Gmail Takeout MBOX archives into SQLite.

```sh
npm run db:init
```

The database is created at `db/emails.sqlite3`. Database migrations live in `migrations/` and are applied automatically.

Copy Gmail Takeout `.mbox` files into `mbox/`, then run:

```sh
npm run db:import
```
