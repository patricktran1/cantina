# Cantina V1 Architecture

## Product boundary

Cantina is a procurement and clearing system, not a wallet with an LLM attached. The durable commercial transaction is:

```text
mandate -> request -> quote set -> decision -> authorization -> job -> evidence -> clearing -> settlement -> audit
```

Each step creates explicit state and evidence. External providers, protocols, models, and payment rails sit behind adapters.

## Major components

### Presentation

Next.js App Router pages and route handlers. The UI never receives secrets and never posts ledger entries directly.

### Procurement domain

- Request-level mandate validation.
- Quote-level compliance filtering.
- Deterministic scoring of compliant quotes.
- Human-approval threshold detection.
- Explicit state-transition guards.

### Marketplace

Supplier profiles and offers are machine-readable. A quote snapshots price, duration, reliability, region, privacy controls, and compliance results.

### Execution and verification

The V1 executor creates deterministic mock output. Verification checks item count, non-empty content, and a SHA-256 checksum. Real providers will implement the same interface.

### Clearing and ledger

Delivery evidence maps to `DELIVERED`, `PARTIAL`, `FAILED`, or `DISPUTED`. Balanced journal transactions use integer minor units and unique idempotency keys. The ledger is the financial source of truth.

### Audit

Every material action appends a sequence-numbered, hash-chained event. Database triggers that prevent updates and deletes are part of the next hardening milestone.

## Persistence modes

### Vercel deployment

Managed PostgreSQL with Prisma is the durable adapter. Purchase requests, quotes, decisions, authorizations, jobs, evidence, clearing outcomes, ledger entries, and audit events survive function recycling and redeployment.

### Test and isolated development

The process-local adapter exercises the same domain flow without infrastructure. It is not production persistence.

## Current transaction boundary

The V1 database path persists each workflow step durably and uses idempotency keys to suppress duplicate purchases and journal operations. The next hardening step is to group financial state changes in serializable database transactions and introduce a transactional outbox before external supplier execution.

## Failure design

- Policy violation: reject before any financial hold.
- Insufficient credits: fail authorization with no job execution.
- Duplicate request: return the original result using the request idempotency key.
- Duplicate financial operation: return the original ledger transaction.
- Supplier timeout: retry the external operation, never duplicate authorization.
- Verification failure before capture: release the hold.
- Failure after capture: post a reversing or refund transaction, never edit the original journal.
- Audit write failure: fail the encompassing financial transaction.

## Scaling path

1. Synchronous Vercel workflow with managed PostgreSQL.
2. Serializable financial transactions and transactional outbox.
3. Background workflow engine.
4. Supplier adapter SDK.
5. Observed performance and reputation service.
6. Multi-region routing.
7. Regulated settlement adapters.
