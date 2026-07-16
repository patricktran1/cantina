# Verification Record

Verification performed for the Vercel-ready Cantina V1 source package before publication.

## Passed

```text
npm run lint       PASS
npm test           PASS: 11 tests across 5 files
npx tsc --noEmit   PASS
npm run build      PASS
HTTP /api/health   PASS: 200
HTTP /             PASS: 200
npm audit          PASS: 0 vulnerabilities
```

The production build contains dynamic routes for the dashboard, purchasing API, purchase result, transactions, suppliers, mandates, and audit log.

## Persistence modes

- Without `DATABASE_URL`, the application uses the in-memory adapter for tests and isolated development.
- With `DATABASE_URL`, reads and writes route to managed PostgreSQL.
- `/api/health` reports the selected persistence mode.

## External boundary not yet verified

A live Vercel deployment and live managed PostgreSQL connection have not been provisioned from this environment. The database-backed path should be accepted after the checklist in `docs/VERCEL_DEPLOYMENT.md` passes against the connected Vercel database.

## Complete clearing milestone

Verified after adding all four clearing outcomes:

- `npm run lint` passes.
- `npm test` passes with 23 tests across 6 files.
- `npx tsc --noEmit` passes.
- `npm run build` passes.
- HTTP smoke tests pass for `DELIVERED`, `PARTIAL`, `FAILED`, and `DISPUTED`.
- Partial delivery captures 18 cents and releases 8 cents from a 26-cent authorization.
- Failed delivery releases the full 26-cent hold.
- Disputed delivery leaves the 26-cent authorization held for review.

