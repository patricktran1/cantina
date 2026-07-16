import type { LedgerPosting, LedgerTransactionDraft } from "./types";

function total(postings: LedgerPosting[], direction: "DEBIT" | "CREDIT"): number {
  return postings
    .filter((posting) => posting.direction === direction)
    .reduce((sum, posting) => sum + posting.amountMinor, 0);
}

export function assertBalanced(postings: LedgerPosting[]): void {
  if (postings.length < 2) {
    throw new Error("A ledger transaction requires at least two entries.");
  }
  if (postings.some((posting) => !Number.isInteger(posting.amountMinor) || posting.amountMinor <= 0)) {
    throw new Error("Ledger amounts must be positive integer minor units.");
  }
  const debits = total(postings, "DEBIT");
  const credits = total(postings, "CREDIT");
  if (debits !== credits) {
    throw new Error(`Unbalanced ledger transaction: debits=${debits}, credits=${credits}`);
  }
}

export function createAuthorizationHold(args: {
  organizationSlug: string;
  amountMinor: number;
  referenceId: string;
  idempotencyKey: string;
}): LedgerTransactionDraft {
  const available = `ORG:${args.organizationSlug}:CUSTOMER_AVAILABLE`;
  const held = `ORG:${args.organizationSlug}:CUSTOMER_HELD`;
  return {
    type: "AUTHORIZATION_HOLD",
    idempotencyKey: args.idempotencyKey,
    referenceType: "purchase_request",
    referenceId: args.referenceId,
    description: "Move customer credits from available to held.",
    currency: "USD",
    postings: [
      { accountCode: available, direction: "DEBIT", amountMinor: args.amountMinor },
      { accountCode: held, direction: "CREDIT", amountMinor: args.amountMinor },
    ],
  };
}

export function createCapture(args: {
  organizationSlug: string;
  captureAmountMinor: number;
  platformFeeMinor: number;
  referenceId: string;
  idempotencyKey: string;
}): LedgerTransactionDraft {
  const supplierAmountMinor = args.captureAmountMinor - args.platformFeeMinor;
  if (supplierAmountMinor <= 0) {
    throw new Error("Supplier settlement amount must be positive.");
  }
  const postings: LedgerPosting[] = [
    {
      accountCode: `ORG:${args.organizationSlug}:CUSTOMER_HELD`,
      direction: "DEBIT",
      amountMinor: args.captureAmountMinor,
    },
    { accountCode: "SYSTEM:SUPPLIER_PAYABLE", direction: "CREDIT", amountMinor: supplierAmountMinor },
  ];
  if (args.platformFeeMinor > 0) {
    postings.push({ accountCode: "SYSTEM:PLATFORM_REVENUE", direction: "CREDIT", amountMinor: args.platformFeeMinor });
  }
  return {
    type: "CAPTURE",
    idempotencyKey: args.idempotencyKey,
    referenceType: "purchase_request",
    referenceId: args.referenceId,
    description: "Capture held funds after delivery verification.",
    currency: "USD",
    postings,
  };
}

export function createDeliveredCapture(args: {
  organizationSlug: string;
  authorizedAmountMinor: number;
  platformFeeMinor: number;
  referenceId: string;
  idempotencyKey: string;
}): LedgerTransactionDraft {
  return createCapture({
    organizationSlug: args.organizationSlug,
    captureAmountMinor: args.authorizedAmountMinor,
    platformFeeMinor: args.platformFeeMinor,
    referenceId: args.referenceId,
    idempotencyKey: args.idempotencyKey,
  });
}

export function createSupplierSettlement(args: {
  amountMinor: number;
  referenceId: string;
  idempotencyKey: string;
}): LedgerTransactionDraft {
  return {
    type: "SUPPLIER_SETTLEMENT",
    idempotencyKey: args.idempotencyKey,
    referenceType: "purchase_request",
    referenceId: args.referenceId,
    description: "Settle supplier payable against simulated settlement cash.",
    currency: "USD",
    postings: [
      { accountCode: "SYSTEM:SUPPLIER_PAYABLE", direction: "DEBIT", amountMinor: args.amountMinor },
      { accountCode: "SYSTEM:SIMULATED_SETTLEMENT", direction: "CREDIT", amountMinor: args.amountMinor },
    ],
  };
}

export function createHoldRelease(args: {
  organizationSlug: string;
  amountMinor: number;
  referenceId: string;
  idempotencyKey: string;
}): LedgerTransactionDraft {
  return {
    type: "HOLD_RELEASE",
    idempotencyKey: args.idempotencyKey,
    referenceType: "purchase_request",
    referenceId: args.referenceId,
    description: "Release held customer credits back to available funds.",
    currency: "USD",
    postings: [
      { accountCode: `ORG:${args.organizationSlug}:CUSTOMER_HELD`, direction: "DEBIT", amountMinor: args.amountMinor },
      { accountCode: `ORG:${args.organizationSlug}:CUSTOMER_AVAILABLE`, direction: "CREDIT", amountMinor: args.amountMinor },
    ],
  };
}

export function createInitialFunding(args: {
  organizationSlug: string;
  amountMinor: number;
  referenceId: string;
  idempotencyKey: string;
}): LedgerTransactionDraft {
  return {
    type: "FUNDING",
    idempotencyKey: args.idempotencyKey,
    referenceType: "organization",
    referenceId: args.referenceId,
    description: "Issue simulated customer credits for the local demo.",
    currency: "USD",
    postings: [
      { accountCode: "SYSTEM:SIMULATED_SETTLEMENT", direction: "DEBIT", amountMinor: args.amountMinor },
      { accountCode: `ORG:${args.organizationSlug}:CUSTOMER_AVAILABLE`, direction: "CREDIT", amountMinor: args.amountMinor },
    ],
  };
}
