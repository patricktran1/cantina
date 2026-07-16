export const purchaseTransitions = {
  CREATED: ["POLICY_EVALUATED", "REJECTED", "FAILED"],
  POLICY_EVALUATED: ["QUOTED", "REJECTED", "FAILED"],
  QUOTED: ["DECIDED", "REJECTED", "FAILED"],
  DECIDED: ["AWAITING_APPROVAL", "AUTHORIZED", "REJECTED", "FAILED"],
  AWAITING_APPROVAL: ["AUTHORIZED", "REJECTED", "FAILED"],
  AUTHORIZED: ["EXECUTING", "FAILED"],
  EXECUTING: ["VERIFYING", "FAILED"],
  VERIFYING: ["CLEARING", "DISPUTED", "FAILED"],
  CLEARING: ["SETTLED", "DISPUTED", "FAILED"],
  SETTLED: [],
  REJECTED: [],
  FAILED: [],
  DISPUTED: [],
} as const;

export type PurchaseState = keyof typeof purchaseTransitions;

export function assertPurchaseTransition(from: PurchaseState, to: PurchaseState): void {
  const allowed = purchaseTransitions[from] as readonly PurchaseState[];
  if (!allowed.includes(to)) {
    throw new Error(`Invalid purchase transition: ${from} -> ${to}`);
  }
}

export const clearingTransitions = {
  PENDING: ["DELIVERED", "PARTIAL", "FAILED", "DISPUTED"],
  DELIVERED: ["SETTLED"],
  PARTIAL: ["SETTLED", "HELD_FOR_REVIEW"],
  FAILED: ["REFUNDED"],
  DISPUTED: ["HELD_FOR_REVIEW", "SETTLED", "REFUNDED"],
  SETTLED: [],
  REFUNDED: [],
  HELD_FOR_REVIEW: ["SETTLED", "REFUNDED"],
} as const;

export type ClearingLifecycleState = keyof typeof clearingTransitions;

export function assertClearingTransition(from: ClearingLifecycleState, to: ClearingLifecycleState): void {
  const allowed = clearingTransitions[from] as readonly ClearingLifecycleState[];
  if (!allowed.includes(to)) {
    throw new Error(`Invalid clearing transition: ${from} -> ${to}`);
  }
}
