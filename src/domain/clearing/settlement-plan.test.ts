import { describe, expect, it } from "vitest";
import { createSettlementPlan } from "./settlement-plan";

describe("clearing settlement plans", () => {
  it("captures the full amount for delivered work", () => {
    const plan = createSettlementPlan({ outcome: "DELIVERED", authorizedAmountMinor: 26, measuredItems: 100, expectedItems: 100 });
    expect(plan.captureAmountMinor).toBe(26);
    expect(plan.releaseAmountMinor).toBe(0);
    expect(plan.state).toBe("DELIVERED");
  });

  it("captures proportionally and releases the remainder for partial work", () => {
    const plan = createSettlementPlan({ outcome: "PARTIAL", authorizedAmountMinor: 26, measuredItems: 70, expectedItems: 100 });
    expect(plan.captureAmountMinor).toBe(18);
    expect(plan.releaseAmountMinor).toBe(8);
    expect(plan.supplierSettlementMinor + plan.platformFeeMinor).toBe(18);
  });

  it("releases the entire hold for failed work", () => {
    const plan = createSettlementPlan({ outcome: "FAILED", authorizedAmountMinor: 26, measuredItems: 0, expectedItems: 100 });
    expect(plan.captureAmountMinor).toBe(0);
    expect(plan.releaseAmountMinor).toBe(26);
    expect(plan.authorizationStatus).toBe("RELEASED");
  });

  it("keeps funds held for disputed work", () => {
    const plan = createSettlementPlan({ outcome: "DISPUTED", authorizedAmountMinor: 26, measuredItems: 100, expectedItems: 100 });
    expect(plan.captureAmountMinor).toBe(0);
    expect(plan.releaseAmountMinor).toBe(0);
    expect(plan.settlementStatus).toBe("HELD_FOR_REVIEW");
  });
});
