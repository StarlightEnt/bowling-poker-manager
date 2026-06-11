# Database Migrations

Migration scripts for the Bowling Poker Manager database.

## Convention
- Filename: `YYYYMMDD-description.mjs`
- Always use `IF NOT EXISTS` / `IF EXISTS` to keep scripts idempotent
- Never delete migration files — they are a permanent audit trail
- Mark already-run migrations with `Status: ALREADY RUN` in the header comment

## Running a migration
```powershell
node --use-system-ca --env-file=.env.local migrations/YYYYMMDD-description.mjs
```

## Migration History
| Date | File | Description |
|------|------|-------------|
| 2026-06-06 | 20260606-add-season-start-year.mjs | Add start_year INTEGER to seasons table |
| 2026-06-06 | 20260606-populate-season-dates.mjs | Populate start_date/end_date on seasons from schedule |
| 2026-06-06 | 20260606-fix-summer26-schedule-dates.mjs | Fix weeks 1-6 bowl_dates from 2027 → 2026 (old year inference bug) |
| 2026-06-11 | 20260611-fix-week8-royal-flush-payout.mjs | Fix Week 8 Royal Flush progressive payout records ($6→$33) |
