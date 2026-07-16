import { beforeEach, describe, expect, it } from "vitest";
import { createAndRunPurchase, getDashboardData, listAuditEvents, listTransactions, resetDemoStoreForTests } from "./demo-store";

beforeEach(() => resetDemoStoreForTests());

describe("first vertical slice", () => {
  it("runs request through selection, authorization, execution, verification, and settlement", () => {
    const purchase = createAndRunPurchase({
      taskDescription: "Generate 100 product descriptions for a new catalog.",
      maximumBudgetMinor: 30,
      deadlineSeconds: 180,
      category: "INFERENCE",
      allowedRegions: ["us-west", "us-central"],
      minimumReliabilityBps: 9_900,
      customerDataIncluded: false,
      requireUsDataResidency: true,
      requireStrongPrivacyControls: false,
      humanApprovalThresholdMinor: 2_500,
      idempotencyKey: "test-purchase-001",
    });

    expect(purchase.status).toBe("SETTLED");
    expect(purchase.decision.selectedSupplierName).toBe("Nova Compute");
    expect(purchase.authorization?.status).toBe("CAPTURED");
    expect(purchase.job?.output.items).toHaveLength(100);
    expect(purchase.verification?.status).toBe("VERIFIED");
    expect(purchase.clearing?.state).toBe("DELIVERED");
    expect(listTransactions().every((transaction) => {
      const debits = transaction.entries.filter((entry) => entry.direction === "DEBIT").reduce((sum, entry) => sum + entry.amountMinor, 0);
      const credits = transaction.entries.filter((entry) => entry.direction === "CREDIT").reduce((sum, entry) => sum + entry.amountMinor, 0);
      return debits === credits;
    })).toBe(true);
    expect(listAuditEvents().some((event) => event.eventType === "PAYMENT_SETTLED")).toBe(true);
    expect(getDashboardData().totalSpendMinor).toBe(26);
  });

  it("is idempotent for the same purchase key", () => {
    const input = {
      taskDescription: "Generate 100 product descriptions for a new catalog.",
      maximumBudgetMinor: 30,
      deadlineSeconds: 180,
      category: "INFERENCE" as const,
      allowedRegions: ["us-west"],
      minimumReliabilityBps: 9_900,
      customerDataIncluded: false,
      requireUsDataResidency: true,
      requireStrongPrivacyControls: false,
      humanApprovalThresholdMinor: 2_500,
      idempotencyKey: "test-purchase-idempotent",
    };
    const first = createAndRunPurchase(input);
    const second = createAndRunPurchase(input);
    expect(second.id).toBe(first.id);
    expect(getDashboardData().totalSpendMinor).toBe(26);
  });
});
