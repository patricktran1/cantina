# Database Design

## Aggregate roots

- `Organization`: tenant and ledger owner.
- `Agent`: autonomous purchasing actor.
- `AgentMandate`: versioned procurement authority.
- `PurchaseRequest`: commercial transaction aggregate.
- `Supplier`: marketplace participant.
- `LedgerTransaction`: immutable journal aggregate.
- `AuditEvent`: immutable evidence record.

## Purchase transaction relationships

```text
PurchaseRequest
  ├── SupplierQuote[]
  ├── PurchaseDecision
  ├── PurchaseAuthorization
  ├── Job
  │     ├── JobOutput[]
  │     └── DeliveryEvidence[]
  ├── ClearingDecision
  └── AuditEvent[]
```

## Production database invariants

Prisma expresses the relational model. The hardening migration should additionally enforce:

1. `ledger_entries.amount_minor > 0`.
2. Reliability and reputation between `0` and `10000`.
3. Privacy scores between `0` and `100`.
4. Monetary limits greater than or equal to zero.
5. Audit event update/delete prevention triggers.
6. Ledger entry and posted transaction update/delete prevention triggers.
7. A deferred constraint trigger that verifies every posted transaction balances.
8. Organization-scoped locking or serializable isolation for audit sequence allocation.

## Asynchronous transaction boundaries

A real supplier call must not hold a database transaction open:

1. Persist the request, decision, authorization hold, audit evidence, and outbox job atomically.
2. Execute the supplier call using a stable job idempotency key.
3. Persist output and verification evidence.
4. Post capture, release, refund, or dispute entries and their audit evidence atomically.

## Index strategy

The schema includes initial indexes for purchase status, organization and creation time, quote compliance, ledger references, ledger account activity, and audit event lookup. Add partial indexes after observing real query patterns rather than guessing them now.
