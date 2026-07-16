import { createHash, randomUUID } from "node:crypto";
import { executeMockJob, verifyMockDelivery } from "@/domain/execution/mock-executor";
import {
  assertBalanced,
  createAuthorizationHold,
  createDeliveredCapture,
  createInitialFunding,
  createSupplierSettlement,
} from "@/domain/ledger/ledger";
import type { LedgerTransactionDraft } from "@/domain/ledger/types";
import { evaluateRequestAgainstMandate } from "@/domain/procurement/policy-engine";
import { evaluateAndRankSuppliers, selectSupplier } from "@/domain/procurement/selection";
import { assertPurchaseTransition } from "@/domain/procurement/state-machines";
import type {
  EvaluatedQuote,
  PurchaseRequestInput,
  PurchasingMandate,
  ResourceCategory,
  SupplierCandidate,
} from "@/domain/procurement/types";
import type { ValidatedPurchaseRequest } from "@/domain/procurement/schemas";

export interface DemoSupplier {
  id: string;
  slug: string;
  name: string;
  description: string;
  regions: string[];
  reliabilityBps: number;
  privacyScore: number;
  complianceControls: string[];
  priceMinor: number;
  estimatedDurationSeconds: number;
  completedJobs: number;
  failedJobs: number;
  reputationScoreBps: number;
}

export interface DemoLedgerEntry {
  id: string;
  accountCode: string;
  direction: "DEBIT" | "CREDIT";
  amountMinor: number;
  memo?: string;
}

export interface DemoLedgerTransaction {
  id: string;
  type: LedgerTransactionDraft["type"];
  idempotencyKey: string;
  referenceType: string;
  referenceId: string;
  description: string;
  currency: string;
  createdAt: string;
  entries: DemoLedgerEntry[];
}

export interface DemoAuditEvent {
  id: string;
  sequence: number;
  eventType: string;
  entityType: string;
  entityId: string;
  purchaseRequestId?: string;
  payload: Record<string, unknown>;
  previousHash: string | null;
  eventHash: string;
  createdAt: string;
}

export interface DemoPurchase {
  id: string;
  idempotencyKey: string;
  taskDescription: string;
  maximumBudgetMinor: number;
  deadlineSeconds: number;
  category: ResourceCategory;
  allowedRegions: string[];
  minimumReliabilityBps: number;
  requireUsDataResidency: boolean;
  requireStrongPrivacyControls: boolean;
  status:
    | "CREATED"
    | "POLICY_EVALUATED"
    | "QUOTED"
    | "DECIDED"
    | "AWAITING_APPROVAL"
    | "AUTHORIZED"
    | "EXECUTING"
    | "VERIFYING"
    | "CLEARING"
    | "SETTLED"
    | "REJECTED"
    | "FAILED"
    | "DISPUTED";
  createdAt: string;
  mandateEvaluation: ReturnType<typeof evaluateRequestAgainstMandate>;
  quotes: EvaluatedQuote[];
  decision: {
    selectedSupplierId: string | null;
    selectedSupplierName: string | null;
    rationale: string;
    requiresHumanApproval: boolean;
    status: "APPROVED" | "AWAITING_HUMAN" | "REJECTED";
  };
  authorization?: {
    id: string;
    amountMinor: number;
    status: "HELD" | "CAPTURED";
  };
  job?: {
    id: string;
    status: "COMPLETED" | "FAILED";
    progressPercent: number;
    supplierName: string;
    output: {
      items: Array<{ id: number; title: string; description: string }>;
      supplier: string;
      generatedAt: string;
    };
    checksum: string;
  };
  verification?: {
    status: "VERIFIED" | "PARTIAL" | "FAILED";
    measuredItems: number;
    expectedItems: number;
    checksumVerified: boolean;
    checks: Record<string, boolean>;
  };
  clearing?: {
    state: "DELIVERED" | "PARTIAL" | "FAILED" | "DISPUTED";
    settlementStatus: "SETTLED" | "REFUNDED" | "HELD_FOR_REVIEW";
    authorizedAmountMinor: number;
    settledAmountMinor: number;
    refundedAmountMinor: number;
    platformFeeMinor: number;
    rationale: string;
  };
}

interface DemoState {
  organization: { id: string; slug: string; name: string };
  mandate: PurchasingMandate & { name: string; objective: string };
  suppliers: DemoSupplier[];
  purchases: DemoPurchase[];
  ledgerTransactions: DemoLedgerTransaction[];
  auditEvents: DemoAuditEvent[];
}

const globalForStore = globalThis as unknown as { __cantinaDemoStore?: DemoState };

function now(): string {
  return new Date().toISOString();
}

function buildInitialState(): DemoState {
  const state: DemoState = {
    organization: { id: "org-cantina-labs", slug: "cantina-labs", name: "Cantina Labs" },
    mandate: {
      id: "mandate-marketing-v1",
      name: "Marketing Content Mandate",
      objective: "Generate marketing content",
      status: "ACTIVE",
      maximumPerJobMinor: 500,
      maximumPerDayMinor: 10_000,
      approvedCategories: ["INFERENCE", "COMPUTE"],
      approvedRegions: ["us-west", "us-central"],
      vendorAllowlist: [],
      customerDataAllowed: false,
      minimumReliabilityBps: 9_900,
      requireUsDataResidency: true,
      requireStrongPrivacyControls: false,
      humanApprovalRequiredAboveMinor: 2_500,
    },
    suppliers: [
      {
        id: "supplier-atlas",
        slug: "atlas-gpu",
        name: "Atlas GPU",
        description: "Lowest-cost inference with broad regional coverage.",
        regions: ["us-west", "eu-west", "ap-southeast"],
        reliabilityBps: 9_700,
        privacyScore: 70,
        complianceControls: ["encryption-at-rest"],
        priceMinor: 18,
        estimatedDurationSeconds: 135,
        completedJobs: 247,
        failedJobs: 8,
        reputationScoreBps: 8_900,
      },
      {
        id: "supplier-nova",
        slug: "nova-compute",
        name: "Nova Compute",
        description: "Fast inference optimized for deadline-sensitive workloads.",
        regions: ["us-west", "us-central"],
        reliabilityBps: 9_900,
        privacyScore: 82,
        complianceControls: ["encryption-at-rest", "soc2"],
        priceMinor: 26,
        estimatedDurationSeconds: 52,
        completedJobs: 418,
        failedJobs: 4,
        reputationScoreBps: 9_500,
      },
      {
        id: "supplier-vault",
        slug: "vault-ai",
        name: "Vault AI",
        description: "Premium US-only processing with the strongest privacy controls.",
        regions: ["us-west", "us-central"],
        reliabilityBps: 9_990,
        privacyScore: 98,
        complianceControls: ["soc2", "private-networking", "zero-retention", "us-only"],
        priceMinor: 44,
        estimatedDurationSeconds: 100,
        completedJobs: 193,
        failedJobs: 0,
        reputationScoreBps: 9_900,
      },
    ],
    purchases: [],
    ledgerTransactions: [],
    auditEvents: [],
  };
  postLedgerTransaction(
    state,
    createInitialFunding({
      organizationSlug: state.organization.slug,
      amountMinor: 100_000,
      referenceId: state.organization.id,
      idempotencyKey: "seed:initial-funding",
    }),
  );
  appendAudit(state, {
    eventType: "DEMO_ORGANIZATION_FUNDED",
    entityType: "organization",
    entityId: state.organization.id,
    payload: { amountMinor: 100_000, currency: "USD" },
  });
  return state;
}

function getState(): DemoState {
  globalForStore.__cantinaDemoStore ??= buildInitialState();
  return globalForStore.__cantinaDemoStore;
}

function appendAudit(
  state: DemoState,
  input: Omit<DemoAuditEvent, "id" | "sequence" | "previousHash" | "eventHash" | "createdAt">,
): DemoAuditEvent {
  const previous = state.auditEvents.at(-1);
  const sequence = (previous?.sequence ?? 0) + 1;
  const createdAt = now();
  const previousHash = previous?.eventHash ?? null;
  const hashPayload = JSON.stringify({ sequence, previousHash, createdAt, ...input });
  const eventHash = createHash("sha256").update(hashPayload).digest("hex");
  const event: DemoAuditEvent = {
    id: randomUUID(),
    sequence,
    previousHash,
    eventHash,
    createdAt,
    ...input,
  };
  state.auditEvents.push(event);
  return event;
}

function postLedgerTransaction(state: DemoState, draft: LedgerTransactionDraft): DemoLedgerTransaction {
  const existing = state.ledgerTransactions.find((transaction) => transaction.idempotencyKey === draft.idempotencyKey);
  if (existing) return existing;
  assertBalanced(draft.postings);
  const transaction: DemoLedgerTransaction = {
    id: randomUUID(),
    type: draft.type,
    idempotencyKey: draft.idempotencyKey,
    referenceType: draft.referenceType,
    referenceId: draft.referenceId,
    description: draft.description,
    currency: draft.currency,
    createdAt: now(),
    entries: draft.postings.map((posting) => ({ id: randomUUID(), ...posting })),
  };
  state.ledgerTransactions.push(transaction);
  return transaction;
}

function accountBalanceMinor(state: DemoState, accountCode: string): number {
  return state.ledgerTransactions.flatMap((transaction) => transaction.entries)
    .filter((entry) => entry.accountCode === accountCode)
    .reduce((balance, entry) => balance + (entry.direction === "CREDIT" ? entry.amountMinor : -entry.amountMinor), 0);
}

function spentTodayMinor(state: DemoState): number {
  const today = new Date().toISOString().slice(0, 10);
  return state.purchases
    .filter((purchase) => purchase.createdAt.slice(0, 10) === today)
    .reduce((sum, purchase) => sum + (purchase.clearing?.settledAmountMinor ?? 0), 0);
}

function supplierCandidates(state: DemoState): SupplierCandidate[] {
  return state.suppliers.map((supplier) => ({
    supplierId: supplier.id,
    supplierSlug: supplier.slug,
    supplierName: supplier.name,
    offerId: `${supplier.id}:inference-v1`,
    priceMinor: supplier.priceMinor,
    estimatedDurationSeconds: supplier.estimatedDurationSeconds,
    reliabilityBps: supplier.reliabilityBps,
    regions: supplier.regions,
    privacyScore: supplier.privacyScore,
    complianceControls: supplier.complianceControls,
  }));
}

function transition(purchase: DemoPurchase, to: DemoPurchase["status"]): void {
  assertPurchaseTransition(purchase.status, to);
  purchase.status = to;
}

export function createAndRunPurchase(input: ValidatedPurchaseRequest): DemoPurchase {
  const state = getState();
  const existing = state.purchases.find((purchase) => purchase.idempotencyKey === input.idempotencyKey);
  if (existing) return structuredClone(existing);

  const request: PurchaseRequestInput = {
    taskDescription: input.taskDescription,
    maximumBudgetMinor: input.maximumBudgetMinor,
    deadlineSeconds: input.deadlineSeconds,
    category: input.category,
    allowedRegions: input.allowedRegions,
    minimumReliabilityBps: input.minimumReliabilityBps,
    customerDataIncluded: input.customerDataIncluded,
    requireUsDataResidency: input.requireUsDataResidency,
    requireStrongPrivacyControls: input.requireStrongPrivacyControls,
    humanApprovalThresholdMinor: input.humanApprovalThresholdMinor,
  };

  const purchase: DemoPurchase = {
    id: randomUUID(),
    idempotencyKey: input.idempotencyKey,
    taskDescription: input.taskDescription,
    maximumBudgetMinor: input.maximumBudgetMinor,
    deadlineSeconds: input.deadlineSeconds,
    category: input.category,
    allowedRegions: input.allowedRegions,
    minimumReliabilityBps: input.minimumReliabilityBps,
    requireUsDataResidency: input.requireUsDataResidency,
    requireStrongPrivacyControls: input.requireStrongPrivacyControls,
    status: "CREATED",
    createdAt: now(),
    mandateEvaluation: { compliant: false, checks: [] },
    quotes: [],
    decision: {
      selectedSupplierId: null,
      selectedSupplierName: null,
      rationale: "Pending policy evaluation.",
      requiresHumanApproval: false,
      status: "REJECTED",
    },
  };
  state.purchases.unshift(purchase);
  appendAudit(state, {
    eventType: "REQUEST_CREATED",
    entityType: "purchase_request",
    entityId: purchase.id,
    purchaseRequestId: purchase.id,
    payload: { taskDescription: purchase.taskDescription, maximumBudgetMinor: purchase.maximumBudgetMinor },
  });

  purchase.mandateEvaluation = evaluateRequestAgainstMandate({
    request,
    mandate: state.mandate,
    spentTodayMinor: spentTodayMinor(state),
  });
  if (!purchase.mandateEvaluation.compliant) {
    transition(purchase, "REJECTED");
    purchase.decision = {
      selectedSupplierId: null,
      selectedSupplierName: null,
      rationale: "The purchase request violated one or more deterministic mandate rules.",
      requiresHumanApproval: false,
      status: "REJECTED",
    };
    appendAudit(state, {
      eventType: "POLICY_REJECTED",
      entityType: "purchase_request",
      entityId: purchase.id,
      purchaseRequestId: purchase.id,
      payload: { checks: purchase.mandateEvaluation.checks },
    });
    return structuredClone(purchase);
  }

  transition(purchase, "POLICY_EVALUATED");
  appendAudit(state, {
    eventType: "POLICY_EVALUATED",
    entityType: "purchase_request",
    entityId: purchase.id,
    purchaseRequestId: purchase.id,
    payload: { compliant: true, checks: purchase.mandateEvaluation.checks },
  });

  purchase.quotes = evaluateAndRankSuppliers({ request, mandate: state.mandate, suppliers: supplierCandidates(state) });
  transition(purchase, "QUOTED");
  appendAudit(state, {
    eventType: "QUOTES_RECEIVED",
    entityType: "purchase_request",
    entityId: purchase.id,
    purchaseRequestId: purchase.id,
    payload: {
      quotes: purchase.quotes.map((quote) => ({
        supplier: quote.supplierName,
        priceMinor: quote.priceMinor,
        compliant: quote.compliance.compliant,
      })),
    },
  });

  const selection = selectSupplier({ request, mandate: state.mandate, evaluatedQuotes: purchase.quotes });
  if (!selection.selected) {
    transition(purchase, "REJECTED");
    purchase.decision = {
      selectedSupplierId: null,
      selectedSupplierName: null,
      rationale: selection.rationale,
      requiresHumanApproval: false,
      status: "REJECTED",
    };
    appendAudit(state, {
      eventType: "PURCHASE_REJECTED",
      entityType: "purchase_request",
      entityId: purchase.id,
      purchaseRequestId: purchase.id,
      payload: { rationale: selection.rationale },
    });
    return structuredClone(purchase);
  }

  transition(purchase, "DECIDED");
  purchase.decision = {
    selectedSupplierId: selection.selected.supplierId,
    selectedSupplierName: selection.selected.supplierName,
    rationale: selection.rationale,
    requiresHumanApproval: selection.requiresHumanApproval,
    status: selection.requiresHumanApproval ? "AWAITING_HUMAN" : "APPROVED",
  };
  appendAudit(state, {
    eventType: "SUPPLIER_SELECTED",
    entityType: "purchase_decision",
    entityId: purchase.id,
    purchaseRequestId: purchase.id,
    payload: {
      supplierId: selection.selected.supplierId,
      supplierName: selection.selected.supplierName,
      rationale: selection.rationale,
    },
  });

  if (selection.requiresHumanApproval) {
    transition(purchase, "AWAITING_APPROVAL");
    appendAudit(state, {
      eventType: "HUMAN_APPROVAL_REQUIRED",
      entityType: "purchase_decision",
      entityId: purchase.id,
      purchaseRequestId: purchase.id,
      payload: { amountMinor: selection.selected.priceMinor },
    });
    return structuredClone(purchase);
  }

  const availableAccount = `ORG:${state.organization.slug}:CUSTOMER_AVAILABLE`;
  const availableBalance = accountBalanceMinor(state, availableAccount);
  if (availableBalance < selection.selected.priceMinor) {
    transition(purchase, "FAILED");
    appendAudit(state, {
      eventType: "AUTHORIZATION_FAILED",
      entityType: "purchase_authorization",
      entityId: purchase.id,
      purchaseRequestId: purchase.id,
      payload: { reason: "INSUFFICIENT_SIMULATED_CREDITS", availableBalance },
    });
    return structuredClone(purchase);
  }

  const authorizationId = randomUUID();
  postLedgerTransaction(
    state,
    createAuthorizationHold({
      organizationSlug: state.organization.slug,
      amountMinor: selection.selected.priceMinor,
      referenceId: purchase.id,
      idempotencyKey: `purchase:${purchase.id}:hold`,
    }),
  );
  purchase.authorization = { id: authorizationId, amountMinor: selection.selected.priceMinor, status: "HELD" };
  transition(purchase, "AUTHORIZED");
  appendAudit(state, {
    eventType: "AUTHORIZATION_CREATED",
    entityType: "purchase_authorization",
    entityId: authorizationId,
    purchaseRequestId: purchase.id,
    payload: { amountMinor: selection.selected.priceMinor, status: "HELD" },
  });

  transition(purchase, "EXECUTING");
  appendAudit(state, {
    eventType: "JOB_STARTED",
    entityType: "job",
    entityId: purchase.id,
    purchaseRequestId: purchase.id,
    payload: { supplierName: selection.selected.supplierName },
  });
  const result = executeMockJob({ taskDescription: purchase.taskDescription, supplierName: selection.selected.supplierName });
  purchase.job = {
    id: randomUUID(),
    status: "COMPLETED",
    progressPercent: 100,
    supplierName: selection.selected.supplierName,
    output: result.output,
    checksum: result.checksum,
  };
  transition(purchase, "VERIFYING");
  appendAudit(state, {
    eventType: "JOB_COMPLETED",
    entityType: "job",
    entityId: purchase.job.id,
    purchaseRequestId: purchase.id,
    payload: { itemCount: result.output.items.length, checksum: result.checksum },
  });

  purchase.verification = verifyMockDelivery(result);
  appendAudit(state, {
    eventType: "OUTPUT_VERIFIED",
    entityType: "delivery_evidence",
    entityId: purchase.job.id,
    purchaseRequestId: purchase.id,
    payload: purchase.verification,
  });

  transition(purchase, "CLEARING");
  if (purchase.verification.status !== "VERIFIED") {
    transition(purchase, purchase.verification.status === "PARTIAL" ? "DISPUTED" : "FAILED");
    return structuredClone(purchase);
  }

  const platformFeeMinor = Math.max(1, Math.ceil(selection.selected.priceMinor * 0.05));
  const supplierSettlementMinor = selection.selected.priceMinor - platformFeeMinor;
  postLedgerTransaction(
    state,
    createDeliveredCapture({
      organizationSlug: state.organization.slug,
      authorizedAmountMinor: selection.selected.priceMinor,
      platformFeeMinor,
      referenceId: purchase.id,
      idempotencyKey: `purchase:${purchase.id}:capture`,
    }),
  );
  postLedgerTransaction(
    state,
    createSupplierSettlement({
      amountMinor: supplierSettlementMinor,
      referenceId: purchase.id,
      idempotencyKey: `purchase:${purchase.id}:supplier-settlement`,
    }),
  );
  purchase.authorization.status = "CAPTURED";
  purchase.clearing = {
    state: "DELIVERED",
    settlementStatus: "SETTLED",
    authorizedAmountMinor: selection.selected.priceMinor,
    settledAmountMinor: selection.selected.priceMinor,
    refundedAmountMinor: 0,
    platformFeeMinor,
    rationale: "All expected output items were present and the delivery checksum matched. Full payment released.",
  };
  transition(purchase, "SETTLED");
  const supplier = state.suppliers.find((item) => item.id === selection.selected?.supplierId);
  if (supplier) supplier.completedJobs += 1;
  appendAudit(state, {
    eventType: "CLEARING_DECISION_ISSUED",
    entityType: "clearing_decision",
    entityId: purchase.id,
    purchaseRequestId: purchase.id,
    payload: purchase.clearing,
  });
  appendAudit(state, {
    eventType: "PAYMENT_SETTLED",
    entityType: "ledger_transaction",
    entityId: purchase.id,
    purchaseRequestId: purchase.id,
    payload: { supplierSettlementMinor, platformFeeMinor },
  });

  return structuredClone(purchase);
}

export function getDashboardData() {
  const state = getState();
  return {
    organization: structuredClone(state.organization),
    totalSpendMinor: state.purchases.reduce((sum, purchase) => sum + (purchase.clearing?.settledAmountMinor ?? 0), 0),
    availableBalanceMinor: accountBalanceMinor(state, `ORG:${state.organization.slug}:CUSTOMER_AVAILABLE`),
    heldBalanceMinor: accountBalanceMinor(state, `ORG:${state.organization.slug}:CUSTOMER_HELD`),
    jobsCompleted: state.purchases.filter((purchase) => purchase.job?.status === "COMPLETED").length,
    jobsFailed: state.purchases.filter((purchase) => purchase.status === "FAILED").length,
    activeMandates: state.mandate.status === "ACTIVE" ? 1 : 0,
    recentPurchases: structuredClone(state.purchases.slice(0, 6)),
    recentTransactions: structuredClone(state.ledgerTransactions.slice(-6).reverse()),
    suppliers: structuredClone(state.suppliers),
  };
}

export function listSuppliers(): DemoSupplier[] {
  return structuredClone(getState().suppliers);
}

export function listMandates() {
  return [structuredClone(getState().mandate)];
}

export function listTransactions(): DemoLedgerTransaction[] {
  return structuredClone(getState().ledgerTransactions.slice().reverse());
}

export function listAuditEvents(): DemoAuditEvent[] {
  return structuredClone(getState().auditEvents.slice().reverse());
}

export function getPurchase(id: string): DemoPurchase | null {
  const purchase = getState().purchases.find((item) => item.id === id);
  return purchase ? structuredClone(purchase) : null;
}

export function resetDemoStoreForTests(): void {
  globalForStore.__cantinaDemoStore = buildInitialState();
}
