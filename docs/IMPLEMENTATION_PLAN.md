# Initial Implementation Plan

## Milestone 0: architecture and guardrails

- [x] Define V1 scope and non-goals.
- [x] Define domain boundaries and state machines.
- [x] Design the PostgreSQL and Prisma model.
- [x] Define the chart of accounts and posting rules.
- [x] Establish integer money and basis-point conventions.

## Milestone 1: complete vertical slice

- [x] Seed Atlas GPU, Nova Compute, and Vault AI.
- [x] Create the purchase request form.
- [x] Enforce request and quote-level mandate rules.
- [x] Filter non-compliant suppliers before scoring.
- [x] Select Nova for the canonical request.
- [x] Place an idempotent simulated hold.
- [x] Execute and verify a 100-item mock workload.
- [x] Clear as `DELIVERED`.
- [x] Capture funds, recognize platform revenue, and settle supplier payable.
- [x] Display dashboard, journal, suppliers, mandate, and audit trail.
- [x] Add unit, workflow, and browser-flow tests.

## Milestone 2: Vercel persistence

- [x] Implement the persistence router.
- [x] Implement the managed PostgreSQL and Prisma adapter.
- [x] Bootstrap the demo tenant, suppliers, mandate, accounts, and opening credits idempotently.
- [x] Persist all commercial, execution, ledger, and audit records.
- [x] Derive balances from ledger entries.
- [ ] Commit reviewed Prisma migrations instead of relying on initial `db push`.
- [ ] Add database checks and append-only triggers.
- [ ] Wrap financial operations in serializable transactions.
- [ ] Add database-backed concurrency and reconciliation tests.

## Milestone 3: complete clearing behavior

- [x] Partial capture and remainder release.
- [x] Failed delivery hold release.
- [ ] Post-capture refund transaction.
- [x] Dispute hold and review-queue state.
- [ ] Reviewer resolution actions.
- [ ] Reversal transaction support.
- [ ] Authorization expiry.

## Milestone 4: asynchronous execution

- [ ] Transactional outbox.
- [ ] Inngest or Trigger.dev adapter.
- [ ] Retry-safe supplier execution.
- [ ] Job leases, timeouts, and dead-letter review.
- [ ] Progress events.

## Milestone 5: production controls

- [ ] Clerk or Auth.js authentication.
- [ ] Organization role authorization.
- [ ] Mandate CRUD with immutable versions.
- [ ] Human approval requests and signatures.
- [ ] Supplier administration.
- [ ] Rate limits, logs, metrics, tracing, and invariant alerts.

## Milestone 6: first real provider

- [ ] Provider adapter contract.
- [ ] One real inference API.
- [ ] Quote normalization and provider idempotency.
- [ ] Delivery evidence capture.
- [ ] Observed latency and reliability metrics.

## Decision gate before blockchain

Do not add x402, USDC, or AgentKit until Cantina can reliably answer who authorized a purchase, which mandate permitted it, why a supplier was selected, what was delivered, why money moved, and whether every amount reconciles from immutable entries.
