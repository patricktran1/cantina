# Contributing to Cantina

Cantina favors small, reviewable changes that preserve deterministic purchasing controls, balanced accounting, idempotent financial writes, and explicit simulation boundaries.

## Local validation

Requires Node.js 22 or later.

```bash
npm install
npm run check
npm run test:coverage
npx playwright install chromium
npm run test:e2e
```

## Contribution expectations

- Add or update tests for every domain or workflow behavior change.
- Preserve integer minor units and balanced debit-credit postings.
- Keep policy, authorization, clearing, settlement, and ledger mutation outside model-generated code.
- Add negative tests for invalid transitions, non-compliant quotes, duplicate idempotency keys, and unbalanced postings when relevant.
- Keep real payment rails, unrestricted funds, production identity, and regulated settlement outside the V1 simulation boundary.
- Never commit database credentials, API keys, customer data, or production financial records.

## Pull request checklist

- [ ] The change is focused and documented.
- [ ] `npm run check` passes.
- [ ] Domain coverage includes success and failure paths.
- [ ] The critical browser flow remains green when user-facing behavior changes.
- [ ] Ledger, idempotency, authorization, and simulation boundaries are explained.
