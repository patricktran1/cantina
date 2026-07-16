# Clearing Scenarios

Cantina's demo exposes four deterministic delivery outcomes so the complete clearing and settlement state machine can be exercised without random supplier failures.

## Delivered

- Verification result: `VERIFIED`
- Clearing decision: `DELIVERED`
- Authorization: captured
- Buyer funds: full authorized amount captured
- Supplier: net amount becomes payable and is settled
- Platform: fee is recognized

## Partial

- Verification result: `PARTIAL`
- Clearing decision: `PARTIAL`
- Authorization: partially captured
- Buyer funds: verified fraction captured and unused hold released
- Supplier: receives the captured amount net of the platform fee
- Canonical demo: a 26-cent authorization with 70 of 100 items captures 18 cents and releases 8 cents

## Failed

- Verification result: `FAILED`
- Clearing decision: `FAILED`
- Authorization: released
- Buyer funds: full hold returned to available balance
- Supplier: no payable is created
- Platform: no fee is recognized

## Disputed

- Verification result: `DISPUTED`
- Clearing decision: `DISPUTED`
- Authorization: remains held
- Buyer funds: neither captured nor released
- Supplier: no payment is released
- Next action: manual review and a future reviewer-resolution workflow

## Invariants

Every financial operation uses integer minor units, carries an idempotency key, and creates balanced double-entry postings. The LLM does not determine the financial outcome. Deterministic application logic converts delivery evidence into a settlement plan and then posts the required ledger transactions.
