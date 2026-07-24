## Outcome

Describe the procurement, clearing, settlement, or operator behavior improved by this change.

## Validation

- [ ] `npm run lint`
- [ ] `npm test`
- [ ] `npm run test:coverage`
- [ ] `npx tsc --noEmit`
- [ ] `npm run build`
- [ ] `npm run test:e2e` for user-facing changes

## Evidence

List the unit tests, workflow tests, browser traces, or ledger fixtures that demonstrate the change.

## Financial and safety boundaries

- [ ] Ledger postings remain balanced and use integer minor units.
- [ ] Financial writes remain idempotent.
- [ ] Model output does not authorize, clear, settle, or post ledger entries.
- [ ] Real-money and production-identity behavior is not implied by the simulation.
- [ ] No credentials, customer data, or production financial records are included.
