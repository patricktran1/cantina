import { beforeEach, describe, expect, it } from "vitest";
import { createAndRunPurchase, getDashboardData, listAuditEvents, listTransactions, resetDemoStoreForTests } from "./demo-store";
import type { SimulatedDeliveryOutcome } from "@/domain/clearing/settlement-plan";

beforeEach(() => resetDemoStoreForTests());

function input(outcome: SimulatedDeliveryOutcome, key: string) {
  return {
    taskDescription: "Generate 100 product descriptions for a new catalog.",
    maximumBudgetMinor: 30,
    deadlineSeconds: 180,
    category: "INFERENCE" as const,
    allowedRegions: ["us-west", "us-central"],
    minimumReliabilityBps: 9_900,
    customerDataIncluded: false,
    requireUsDataResidency: true,
    requireStrongPrivacyControls: false,
    humanApprovalThresholdMinor: 2_500,
    simulatedOutcome: outcome,
    idempotencyKey: key,
  };
}

function everyTransactionBalances() {
  return listTransactions().every((transaction) => {
    const debits = transaction.entries.filter((entry) => entry.direction === "DEBIT").reduce((sum, entry) => sum + entry.amountMinor, 0);
    const credits = transaction.entries.filter((entry) => entry.direction === "CREDIT").reduce((sum, entry) => sum + entry.amountMinor, 0);
    return debits === credits;
  });
}

describe("procurement, clearing, and settlement vertical slice", () => {
  it("fully settles delivered work", () => {
    const purchase = createAndRunPurchase(input("DELIVERED", "test-delivered-001"));
    expect(purchase.status).toBe("SETTLED");
    expect(purchase.decision.selectedSupplierName).toBe("Nova Compute");
    expect(purchase.authorization?.status).toBe("CAPTURED");
    expect(purchase.job?.output.items).toHaveLength(100);
    expect(purchase.verification?.status).toBe("VERIFIED");
    expect(purchase.clearing?.state).toBe("DELIVERED");
    expect(purchase.clearing?.settledAmountMinor).toBe(26);
    expect(getDashboardData().totalSpendMinor).toBe(26);
  });

  it("partially captures and releases the unused hold", () => {
    const purchase = createAndRunPurchase(input("PARTIAL", "test-partial-001"));
    expect(purchase.status).toBe("SETTLED");
    expect(purchase.verification?.status).toBe("PARTIAL");
    expect(purchase.clearing?.state).toBe("PARTIAL");
    expect(purchase.clearing?.settledAmountMinor).toBe(18);
    expect(purchase.clearing?.refundedAmountMinor).toBe(8);
    expect(listTransactions().some((transaction) => transaction.type === "HOLD_RELEASE")).toBe(true);
  });

  it("releases all held funds when delivery fails", () => {
    const purchase = createAndRunPurchase(input("FAILED", "test-failed-001"));
    expect(purchase.status).toBe("FAILED");
    expect(purchase.authorization?.status).toBe("RELEASED");
    expect(purchase.verification?.status).toBe("FAILED");
    expect(purchase.clearing?.settlementStatus).toBe("REFUNDED");
    expect(purchase.clearing?.settledAmountMinor).toBe(0);
    expect(getDashboardData().availableBalanceMinor).toBe(100_000);
  });

  it("keeps authorization funds held for disputed work", () => {
    const purchase = createAndRunPurchase(input("DISPUTED", "test-disputed-001"));
    expect(purchase.status).toBe("DISPUTED");
    expect(purchase.authorization?.status).toBe("HELD");
    expect(purchase.verification?.status).toBe("DISPUTED");
    expect(purchase.clearing?.settlementStatus).toBe("HELD_FOR_REVIEW");
    expect(getDashboardData().heldBalanceMinor).toBe(26);
    expect(listAuditEvents().some((event) => event.eventType === "FUNDS_HELD_FOR_REVIEW")).toBe(true);
  });

  it("keeps every financial operation balanced", () => {
    createAndRunPurchase(input("PARTIAL", "test-balanced-001"));
    expect(everyTransactionBalances()).toBe(true);
  });

  it("is idempotent for the same purchase key", () => {
    const purchaseInput = input("DELIVERED", "test-purchase-idempotent");
    const first = createAndRunPurchase(purchaseInput);
    const second = createAndRunPurchase(purchaseInput);
    expect(second.id).toBe(first.id);
    expect(getDashboardData().totalSpendMinor).toBe(26);
  });
});
