export const simulatedDeliveryOutcomes = ["DELIVERED", "PARTIAL", "FAILED", "DISPUTED"] as const;

export type SimulatedDeliveryOutcome = (typeof simulatedDeliveryOutcomes)[number];

export interface SettlementPlan {
  state: SimulatedDeliveryOutcome;
  settlementStatus: "SETTLED" | "REFUNDED" | "HELD_FOR_REVIEW";
  captureAmountMinor: number;
  releaseAmountMinor: number;
  supplierSettlementMinor: number;
  platformFeeMinor: number;
  refundedAmountMinor: number;
  finalPurchaseStatus: "SETTLED" | "FAILED" | "DISPUTED";
  authorizationStatus: "HELD" | "CAPTURED" | "RELEASED";
  rationale: string;
}

function platformFeeFor(captureAmountMinor: number): number {
  if (captureAmountMinor <= 1) return 0;
  return Math.min(captureAmountMinor - 1, Math.max(1, Math.ceil(captureAmountMinor * 0.05)));
}

export function createSettlementPlan(args: {
  outcome: SimulatedDeliveryOutcome;
  authorizedAmountMinor: number;
  measuredItems: number;
  expectedItems: number;
}): SettlementPlan {
  if (!Number.isInteger(args.authorizedAmountMinor) || args.authorizedAmountMinor <= 0) {
    throw new Error("Authorized amount must be a positive integer in minor units.");
  }

  if (args.outcome === "DISPUTED") {
    return {
      state: "DISPUTED",
      settlementStatus: "HELD_FOR_REVIEW",
      captureAmountMinor: 0,
      releaseAmountMinor: 0,
      supplierSettlementMinor: 0,
      platformFeeMinor: 0,
      refundedAmountMinor: 0,
      finalPurchaseStatus: "DISPUTED",
      authorizationStatus: "HELD",
      rationale: "Delivery evidence requires manual review. Authorized funds remain held and no supplier payment is released.",
    };
  }

  if (args.outcome === "FAILED" || args.measuredItems <= 0) {
    return {
      state: "FAILED",
      settlementStatus: "REFUNDED",
      captureAmountMinor: 0,
      releaseAmountMinor: args.authorizedAmountMinor,
      supplierSettlementMinor: 0,
      platformFeeMinor: 0,
      refundedAmountMinor: args.authorizedAmountMinor,
      finalPurchaseStatus: "FAILED",
      authorizationStatus: "RELEASED",
      rationale: "No usable delivery was verified. The authorization hold was fully released back to the buyer.",
    };
  }

  const captureAmountMinor = args.outcome === "DELIVERED"
    ? args.authorizedAmountMinor
    : Math.max(
        1,
        Math.min(
          args.authorizedAmountMinor,
          Math.floor(args.authorizedAmountMinor * (args.measuredItems / Math.max(args.expectedItems, 1))),
        ),
      );
  const platformFeeMinor = platformFeeFor(captureAmountMinor);
  const supplierSettlementMinor = captureAmountMinor - platformFeeMinor;
  const releaseAmountMinor = args.authorizedAmountMinor - captureAmountMinor;

  if (args.outcome === "PARTIAL") {
    return {
      state: "PARTIAL",
      settlementStatus: "SETTLED",
      captureAmountMinor,
      releaseAmountMinor,
      supplierSettlementMinor,
      platformFeeMinor,
      refundedAmountMinor: releaseAmountMinor,
      finalPurchaseStatus: "SETTLED",
      authorizationStatus: "CAPTURED",
      rationale: `Partial delivery verified (${args.measuredItems}/${args.expectedItems} items). Payment was adjusted proportionally and the unused hold was released.`,
    };
  }

  return {
    state: "DELIVERED",
    settlementStatus: "SETTLED",
    captureAmountMinor,
    releaseAmountMinor: 0,
    supplierSettlementMinor,
    platformFeeMinor,
    refundedAmountMinor: 0,
    finalPurchaseStatus: "SETTLED",
    authorizationStatus: "CAPTURED",
    rationale: "All expected output items were present and delivery integrity checks passed. Full payment was released.",
  };
}
