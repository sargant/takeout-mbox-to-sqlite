# takeout-mbox-to-sqlite

Import Gmail Takeout MBOX archives into SQLite.

```sh
npm run db:init -- ./archive.sqlite
```

Database migrations live in `migrations/` and are applied automatically.
