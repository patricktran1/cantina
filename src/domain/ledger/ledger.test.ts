import { describe, expect, it } from "vitest";
import {
  assertBalanced,
  createAuthorizationHold,
  createDeliveredCapture,
  createInitialFunding,
  createSupplierSettlement,
} from "./ledger";

function totals(postings: Array<{ direction: string; amountMinor: number }>) {
  return postings.reduce(
    (acc, posting) => {
      acc[posting.direction as "DEBIT" | "CREDIT"] += posting.amountMinor;
      return acc;
    },
    { DEBIT: 0, CREDIT: 0 },
  );
}

describe("double-entry ledger", () => {
  it.each([
    createInitialFunding({ organizationSlug: "cantina-labs", amountMinor: 100_000, referenceId: "org", idempotencyKey: "fund" }),
    createAuthorizationHold({ organizationSlug: "cantina-labs", amountMinor: 26, referenceId: "request", idempotencyKey: "hold" }),
    createDeliveredCapture({ organizationSlug: "cantina-labs", authorizedAmountMinor: 26, platformFeeMinor: 2, referenceId: "request", idempotencyKey: "capture" }),
    createSupplierSettlement({ amountMinor: 24, referenceId: "request", idempotencyKey: "settle" }),
  ])("balances $type", (draft) => {
    expect(() => assertBalanced(draft.postings)).not.toThrow();
    expect(totals(draft.postings).DEBIT).toBe(totals(draft.postings).CREDIT);
  });

  it("rejects an unbalanced transaction", () => {
    expect(() =>
      assertBalanced([
        { accountCode: "A", direction: "DEBIT", amountMinor: 10 },
        { accountCode: "B", direction: "CREDIT", amountMinor: 9 },
      ]),
    ).toThrow(/Unbalanced/);
  });
});
