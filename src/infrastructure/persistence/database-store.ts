/* eslint-disable @typescript-eslint/no-explicit-any */
import type { Prisma } from "@/generated/prisma/client";
import { applySimulatedDeliveryOutcome, executeMockJob, verifyMockDelivery } from "@/domain/execution/mock-executor";
import { createSettlementPlan, type SimulatedDeliveryOutcome } from "@/domain/clearing/settlement-plan";
import {
  createAuthorizationHold,
  createCapture,
  createHoldRelease,
  createSupplierSettlement,
} from "@/domain/ledger/ledger";
import { evaluateRequestAgainstMandate } from "@/domain/procurement/policy-engine";
import { evaluateAndRankSuppliers, selectSupplier } from "@/domain/procurement/selection";
import type {
  PurchaseRequestInput,
  PurchasingMandate,
  ResourceCategory,
  SupplierCandidate,
} from "@/domain/procurement/types";
import type { ValidatedPurchaseRequest } from "@/domain/procurement/schemas";
import type {
  DemoAuditEvent,
  DemoLedgerTransaction,
  DemoPurchase,
  DemoSupplier,
} from "@/lib/demo-store";
import { prisma } from "./prisma/client";
import { ensureCantinaDatabase } from "./prisma/bootstrap";
import { accountBalanceMinor, appendAudit, postLedgerTransaction } from "./prisma/operations";

function json<T>(value: Prisma.JsonValue | null | undefined, fallback: T): T {
  return value == null ? fallback : (value as unknown as T);
}

function toSupplierCandidate(supplier: {
  id: string;
  slug: string;
  name: string;
  regions: string[];
  reliabilityBps: number;
  privacyScore: number;
  complianceControls: string[];
  offers: Array<{ id: string; basePriceMinor: number; estimatedDurationSeconds: number; regions: string[] }>;
}): SupplierCandidate {
  const offer = supplier.offers[0];
  if (!offer) throw new Error(`Supplier ${supplier.name} has no active offer.`);
  return {
    supplierId: supplier.id,
    supplierSlug: supplier.slug,
    supplierName: supplier.name,
    offerId: offer.id,
    priceMinor: offer.basePriceMinor,
    estimatedDurationSeconds: offer.estimatedDurationSeconds,
    reliabilityBps: supplier.reliabilityBps,
    regions: offer.regions.length ? offer.regions : supplier.regions,
    privacyScore: supplier.privacyScore,
    complianceControls: supplier.complianceControls,
  };
}

function toMandate(record: {
  id: string;
  status: "ACTIVE" | "PAUSED" | "ARCHIVED";
  maximumPerJobMinor: number;
  maximumPerDayMinor: number;
  approvedCategories: ResourceCategory[];
  approvedRegions: string[];
  vendorAllowlist: string[];
  customerDataAllowed: boolean;
  minimumReliabilityBps: number;
  requireUsDataResidency: boolean;
  requireStrongPrivacyControls: boolean;
  humanApprovalRequiredAboveMinor: number;
}): PurchasingMandate {
  return { ...record };
}

async function demoContext() {
  await ensureCantinaDatabase();
  const organization = await prisma.organization.findUniqueOrThrow({
    where: { slug: process.env.CANTINA_DEMO_ORG_SLUG ?? "cantina-labs" },
  });
  const agent = await prisma.agent.findUniqueOrThrow({ where: { id: "agent-cantina-demo" } });
  const mandateRecord = await prisma.agentMandate.findUniqueOrThrow({ where: { id: "mandate-marketing-v1" } });
  return { organization, agent, mandateRecord, mandate: toMandate(mandateRecord as never) };
}

async function spentTodayMinor(organizationId: string): Promise<number> {
  const start = new Date();
  start.setUTCHours(0, 0, 0, 0);
  const result = await prisma.clearingDecision.aggregate({
    where: { purchaseRequest: { organizationId, createdAt: { gte: start } } },
    _sum: { settledAmountMinor: true },
  });
  return result._sum.settledAmountMinor ?? 0;
}

async function purchaseRecord(id: string) {
  return prisma.purchaseRequest.findUnique({
    where: { id },
    include: {
      quotes: { include: { supplier: true, supplierOffer: true }, orderBy: { createdAt: "asc" } },
      decision: { include: { selectedQuote: { include: { supplier: true } } } },
      authorization: true,
      job: { include: { supplier: true, outputs: { orderBy: { sequence: "asc" } }, deliveryEvidence: { orderBy: { createdAt: "desc" }, take: 1 } } },
      clearingDecision: true,
    },
  });
}

function mapPurchase(record: NonNullable<Awaited<ReturnType<typeof purchaseRecord>>>): DemoPurchase {
  const policy = json<{ compliant: boolean; checks: Array<{ code: string; passed: boolean; message: string }> }>(
    record.decision?.policyEvaluation,
    { compliant: record.status !== "REJECTED", checks: [] },
  );
  const outputRecord = record.job?.outputs[0];
  const output = json<{ items: Array<{ id: number; title: string; description: string }>; supplier: string; generatedAt: string }>(
    outputRecord?.content,
    { items: [], supplier: record.job?.supplier.name ?? "", generatedAt: record.job?.completedAt?.toISOString() ?? record.createdAt.toISOString() },
  );
  const evidence = record.job?.deliveryEvidence[0];

  return {
    id: record.id,
    idempotencyKey: record.idempotencyKey,
    taskDescription: record.taskDescription,
    maximumBudgetMinor: record.maximumBudgetMinor,
    deadlineSeconds: record.deadlineSeconds,
    category: record.category as ResourceCategory,
    allowedRegions: record.allowedRegions,
    minimumReliabilityBps: record.minimumReliabilityBps,
    requireUsDataResidency: record.requireUsDataResidency,
    requireStrongPrivacyControls: record.requireStrongPrivacyControls,
    simulatedOutcome: record.simulatedOutcome as SimulatedDeliveryOutcome,
    status: record.status,
    createdAt: record.createdAt.toISOString(),
    mandateEvaluation: policy,
    quotes: record.quotes.map((quote: any) => ({
      supplierId: quote.supplierId,
      supplierSlug: quote.supplier.slug,
      supplierName: quote.supplier.name,
      offerId: quote.supplierOfferId,
      priceMinor: quote.priceMinor,
      estimatedDurationSeconds: quote.estimatedDurationSeconds,
      reliabilityBps: quote.reliabilityBps,
      regions: quote.supplierOffer.regions,
      privacyScore: quote.privacyScore,
      complianceControls: quote.supplier.complianceControls,
      selectedRegion: quote.region || null,
      compliance: {
        compliant: quote.complianceStatus === "COMPLIANT",
        checks: json(quote.complianceReasons, []),
      },
      score: quote.score,
    })),
    decision: {
      selectedSupplierId: record.decision?.selectedQuote?.supplierId ?? null,
      selectedSupplierName: record.decision?.selectedQuote?.supplier.name ?? null,
      rationale: record.decision?.rationale ?? "Pending policy evaluation.",
      requiresHumanApproval: record.decision?.requiresHumanApproval ?? false,
      status: record.decision?.status ?? "REJECTED",
    },
    authorization: record.authorization
      ? { id: record.authorization.id, amountMinor: record.authorization.amountMinor, status: record.authorization.status === "CAPTURED" ? "CAPTURED" : record.authorization.status === "RELEASED" ? "RELEASED" : "HELD" }
      : undefined,
    job: record.job
      ? {
          id: record.job.id,
          status: record.job.status === "FAILED" ? "FAILED" : "COMPLETED",
          progressPercent: record.job.progressPercent,
          supplierName: record.job.supplier.name,
          output,
          checksum: outputRecord?.checksum ?? "",
        }
      : undefined,
    verification: evidence
      ? {
          status: evidence.status,
          measuredItems: evidence.measuredItems,
          expectedItems: evidence.expectedItems,
          checksumVerified: evidence.checksumVerified,
          checks: json(evidence.checks, {}),
        }
      : undefined,
    clearing: record.clearingDecision
      ? {
          state: record.clearingDecision.state,
          settlementStatus: record.clearingDecision.settlementStatus,
          authorizedAmountMinor: record.clearingDecision.authorizedAmountMinor,
          settledAmountMinor: record.clearingDecision.settledAmountMinor,
          refundedAmountMinor: record.clearingDecision.refundedAmountMinor,
          platformFeeMinor: record.clearingDecision.platformFeeMinor,
          rationale: record.clearingDecision.rationale,
        }
      : undefined,
  };
}

export async function createAndRunPurchase(input: ValidatedPurchaseRequest): Promise<DemoPurchase> {
  const existing = await prisma.purchaseRequest.findUnique({ where: { idempotencyKey: input.idempotencyKey } });
  if (existing) return mapPurchase((await purchaseRecord(existing.id))!);

  const { organization, agent, mandateRecord, mandate } = await demoContext();
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
    simulatedOutcome: input.simulatedOutcome,
  };

  const created = await prisma.purchaseRequest.create({
    data: {
      organizationId: organization.id,
      agentId: agent.id,
      mandateId: mandateRecord.id,
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
      simulatedOutcome: input.simulatedOutcome,
      idempotencyKey: input.idempotencyKey,
    },
  });

  await appendAudit(prisma, {
    organizationId: organization.id,
    purchaseRequestId: created.id,
    eventType: "REQUEST_CREATED",
    entityType: "purchase_request",
    entityId: created.id,
    payload: { taskDescription: created.taskDescription, maximumBudgetMinor: created.maximumBudgetMinor, simulatedOutcome: input.simulatedOutcome },
  });

  const mandateEvaluation = evaluateRequestAgainstMandate({
    request,
    mandate,
    spentTodayMinor: await spentTodayMinor(organization.id),
  });

  if (!mandateEvaluation.compliant) {
    await prisma.purchaseRequest.update({
      where: { id: created.id },
      data: { status: "REJECTED", rejectionReasons: mandateEvaluation.checks as never },
    });
    await prisma.purchaseDecision.create({
      data: {
        purchaseRequestId: created.id,
        status: "REJECTED",
        rationale: "The purchase request violated one or more deterministic mandate rules.",
        policyEvaluation: mandateEvaluation as never,
      },
    });
    await appendAudit(prisma, {
      organizationId: organization.id,
      purchaseRequestId: created.id,
      eventType: "POLICY_REJECTED",
      entityType: "purchase_request",
      entityId: created.id,
      payload: { checks: mandateEvaluation.checks } as never,
    });
    return mapPurchase((await purchaseRecord(created.id))!);
  }

  await prisma.purchaseRequest.update({ where: { id: created.id }, data: { status: "POLICY_EVALUATED" } });
  await appendAudit(prisma, {
    organizationId: organization.id,
    purchaseRequestId: created.id,
    eventType: "POLICY_EVALUATED",
    entityType: "purchase_request",
    entityId: created.id,
    payload: { compliant: true, checks: mandateEvaluation.checks } as never,
  });

  const supplierRecords = await prisma.supplier.findMany({
    where: { active: true },
    include: { offers: { where: { active: true, category: input.category }, take: 1 } },
    orderBy: { name: "asc" },
  });
  const candidates = supplierRecords.filter((supplier: any) => supplier.offers.length > 0).map(toSupplierCandidate);
  const evaluatedQuotes = evaluateAndRankSuppliers({ request, mandate, suppliers: candidates });

  await prisma.supplierQuote.createMany({
    data: evaluatedQuotes.map((quote) => ({
      purchaseRequestId: created.id,
      supplierId: quote.supplierId,
      supplierOfferId: quote.offerId,
      priceMinor: quote.priceMinor,
      estimatedDurationSeconds: quote.estimatedDurationSeconds,
      reliabilityBps: quote.reliabilityBps,
      region: quote.selectedRegion ?? "",
      privacyScore: quote.privacyScore,
      complianceStatus: quote.compliance.compliant ? "COMPLIANT" : "NON_COMPLIANT",
      complianceReasons: quote.compliance.checks as never,
      score: quote.score,
    })),
  });
  await prisma.purchaseRequest.update({ where: { id: created.id }, data: { status: "QUOTED" } });
  await appendAudit(prisma, {
    organizationId: organization.id,
    purchaseRequestId: created.id,
    eventType: "QUOTES_RECEIVED",
    entityType: "purchase_request",
    entityId: created.id,
    payload: { quotes: evaluatedQuotes.map((quote) => ({ supplier: quote.supplierName, priceMinor: quote.priceMinor, compliant: quote.compliance.compliant })) } as never,
  });

  const selection = selectSupplier({ request, mandate, evaluatedQuotes });
  if (!selection.selected) {
    await prisma.purchaseRequest.update({ where: { id: created.id }, data: { status: "REJECTED" } });
    await prisma.purchaseDecision.create({
      data: {
        purchaseRequestId: created.id,
        status: "REJECTED",
        rationale: selection.rationale,
        policyEvaluation: mandateEvaluation as never,
      },
    });
    return mapPurchase((await purchaseRecord(created.id))!);
  }

  const selectedQuote = await prisma.supplierQuote.findUniqueOrThrow({
    where: { purchaseRequestId_supplierId: { purchaseRequestId: created.id, supplierId: selection.selected.supplierId } },
  });
  await prisma.purchaseDecision.create({
    data: {
      purchaseRequestId: created.id,
      selectedQuoteId: selectedQuote.id,
      status: selection.requiresHumanApproval ? "AWAITING_HUMAN" : "APPROVED",
      rationale: selection.rationale,
      policyEvaluation: mandateEvaluation as never,
      requiresHumanApproval: selection.requiresHumanApproval,
    },
  });
  await prisma.purchaseRequest.update({
    where: { id: created.id },
    data: { status: selection.requiresHumanApproval ? "AWAITING_APPROVAL" : "DECIDED" },
  });
  await appendAudit(prisma, {
    organizationId: organization.id,
    purchaseRequestId: created.id,
    eventType: "SUPPLIER_SELECTED",
    entityType: "purchase_decision",
    entityId: created.id,
    payload: { supplierId: selection.selected.supplierId, supplierName: selection.selected.supplierName, rationale: selection.rationale },
  });

  if (selection.requiresHumanApproval) return mapPurchase((await purchaseRecord(created.id))!);

  const availableBalance = await accountBalanceMinor(prisma, `ORG:${organization.slug}:CUSTOMER_AVAILABLE`);
  if (availableBalance < selection.selected.priceMinor) {
    await prisma.purchaseRequest.update({ where: { id: created.id }, data: { status: "FAILED" } });
    await appendAudit(prisma, {
      organizationId: organization.id,
      purchaseRequestId: created.id,
      eventType: "AUTHORIZATION_FAILED",
      entityType: "purchase_authorization",
      entityId: created.id,
      payload: { reason: "INSUFFICIENT_SIMULATED_CREDITS", availableBalance },
    });
    return mapPurchase((await purchaseRecord(created.id))!);
  }

  const hold = await postLedgerTransaction(
    prisma,
    createAuthorizationHold({
      organizationSlug: organization.slug,
      amountMinor: selection.selected.priceMinor,
      referenceId: created.id,
      idempotencyKey: `purchase:${created.id}:hold`,
    }),
  );
  const authorization = await prisma.purchaseAuthorization.create({
    data: {
      organizationId: organization.id,
      purchaseRequestId: created.id,
      amountMinor: selection.selected.priceMinor,
      status: "HELD",
      idempotencyKey: `purchase:${created.id}:authorization`,
      holdTransactionId: hold.id,
    },
  });
  await prisma.purchaseRequest.update({ where: { id: created.id }, data: { status: "AUTHORIZED" } });
  await appendAudit(prisma, {
    organizationId: organization.id,
    purchaseRequestId: created.id,
    eventType: "AUTHORIZATION_CREATED",
    entityType: "purchase_authorization",
    entityId: authorization.id,
    payload: { amountMinor: authorization.amountMinor, status: authorization.status },
  });

  const job = await prisma.job.create({
    data: {
      purchaseRequestId: created.id,
      supplierId: selection.selected.supplierId,
      status: "RUNNING",
      progressPercent: 10,
      startedAt: new Date(),
    },
  });
  await prisma.purchaseRequest.update({ where: { id: created.id }, data: { status: "EXECUTING" } });
  await appendAudit(prisma, {
    organizationId: organization.id,
    purchaseRequestId: created.id,
    eventType: "JOB_STARTED",
    entityType: "job",
    entityId: job.id,
    payload: { supplierName: selection.selected.supplierName },
  });

  const rawResult = executeMockJob({ taskDescription: input.taskDescription, supplierName: selection.selected.supplierName });
  const result = applySimulatedDeliveryOutcome(rawResult, input.simulatedOutcome);
  await prisma.jobOutput.create({
    data: { jobId: job.id, sequence: 0, content: result.output as never, checksum: result.checksum },
  });
  await prisma.job.update({
    where: { id: job.id },
    data: {
      status: input.simulatedOutcome === "FAILED" ? "FAILED" : "COMPLETED",
      progressPercent: 100,
      completedAt: new Date(),
      failureReason: input.simulatedOutcome === "FAILED" ? "Simulated supplier execution failure." : null,
    },
  });
  await prisma.purchaseRequest.update({ where: { id: created.id }, data: { status: "VERIFYING" } });
  await appendAudit(prisma, {
    organizationId: organization.id,
    purchaseRequestId: created.id,
    eventType: input.simulatedOutcome === "FAILED" ? "JOB_FAILED" : "JOB_COMPLETED",
    entityType: "job",
    entityId: job.id,
    payload: { itemCount: result.output.items.length, checksum: result.checksum, simulatedOutcome: input.simulatedOutcome },
  });

  const verification = verifyMockDelivery(result, { disputed: input.simulatedOutcome === "DISPUTED" });
  await prisma.deliveryEvidence.create({
    data: {
      jobId: job.id,
      status: verification.status,
      evidenceType: "mock-output-count-checksum-and-review-flags",
      checks: verification.checks as never,
      measuredItems: verification.measuredItems,
      expectedItems: verification.expectedItems,
      checksumVerified: verification.checksumVerified,
    },
  });
  await appendAudit(prisma, {
    organizationId: organization.id,
    purchaseRequestId: created.id,
    eventType: "OUTPUT_VERIFIED",
    entityType: "delivery_evidence",
    entityId: job.id,
    payload: verification as never,
  });
  await prisma.purchaseRequest.update({ where: { id: created.id }, data: { status: "CLEARING" } });

  const plan = createSettlementPlan({
    outcome: input.simulatedOutcome,
    authorizedAmountMinor: selection.selected.priceMinor,
    measuredItems: verification.measuredItems,
    expectedItems: verification.expectedItems,
  });

  let captureTransactionId: string | undefined;
  let releaseTransactionId: string | undefined;
  if (plan.captureAmountMinor > 0) {
    const capture = await postLedgerTransaction(
      prisma,
      createCapture({
        organizationSlug: organization.slug,
        captureAmountMinor: plan.captureAmountMinor,
        platformFeeMinor: plan.platformFeeMinor,
        referenceId: created.id,
        idempotencyKey: `purchase:${created.id}:capture`,
      }),
    );
    captureTransactionId = capture.id;
  }
  if (plan.releaseAmountMinor > 0) {
    const release = await postLedgerTransaction(
      prisma,
      createHoldRelease({
        organizationSlug: organization.slug,
        amountMinor: plan.releaseAmountMinor,
        referenceId: created.id,
        idempotencyKey: `purchase:${created.id}:hold-release`,
      }),
    );
    releaseTransactionId = release.id;
  }
  if (plan.supplierSettlementMinor > 0) {
    await postLedgerTransaction(
      prisma,
      createSupplierSettlement({
        amountMinor: plan.supplierSettlementMinor,
        referenceId: created.id,
        idempotencyKey: `purchase:${created.id}:supplier-settlement`,
      }),
    );
  }

  await prisma.purchaseAuthorization.update({
    where: { id: authorization.id },
    data: {
      status: plan.authorizationStatus,
      captureTransactionId,
      releaseTransactionId,
    },
  });
  const clearing = await prisma.clearingDecision.create({
    data: {
      purchaseRequestId: created.id,
      supplierId: selection.selected.supplierId,
      state: plan.state,
      settlementStatus: plan.settlementStatus,
      authorizedAmountMinor: selection.selected.priceMinor,
      settledAmountMinor: plan.captureAmountMinor,
      refundedAmountMinor: plan.refundedAmountMinor,
      platformFeeMinor: plan.platformFeeMinor,
      rationale: plan.rationale,
    },
  });
  await prisma.purchaseRequest.update({ where: { id: created.id }, data: { status: plan.finalPurchaseStatus } });
  if (plan.state === "DELIVERED" || plan.state === "PARTIAL") {
    await prisma.supplier.update({ where: { id: selection.selected.supplierId }, data: { completedJobs: { increment: 1 } } });
  } else if (plan.state === "FAILED") {
    await prisma.supplier.update({ where: { id: selection.selected.supplierId }, data: { failedJobs: { increment: 1 } } });
  }
  await appendAudit(prisma, {
    organizationId: organization.id,
    purchaseRequestId: created.id,
    eventType: "CLEARING_DECISION_ISSUED",
    entityType: "clearing_decision",
    entityId: clearing.id,
    payload: {
      state: clearing.state,
      settlementStatus: clearing.settlementStatus,
      settledAmountMinor: clearing.settledAmountMinor,
      refundedAmountMinor: clearing.refundedAmountMinor,
      platformFeeMinor: clearing.platformFeeMinor,
    },
  });
  await appendAudit(prisma, {
    organizationId: organization.id,
    purchaseRequestId: created.id,
    eventType: plan.state === "DISPUTED"
      ? "FUNDS_HELD_FOR_REVIEW"
      : plan.state === "FAILED"
        ? "AUTHORIZATION_RELEASED"
        : plan.state === "PARTIAL"
          ? "PAYMENT_PARTIALLY_SETTLED"
          : "PAYMENT_SETTLED",
    entityType: "ledger_transaction",
    entityId: captureTransactionId ?? releaseTransactionId ?? authorization.id,
    payload: {
      captureAmountMinor: plan.captureAmountMinor,
      releaseAmountMinor: plan.releaseAmountMinor,
      supplierSettlementMinor: plan.supplierSettlementMinor,
      platformFeeMinor: plan.platformFeeMinor,
    },
  });

  return mapPurchase((await purchaseRecord(created.id))!);
}

export async function getPurchase(id: string): Promise<DemoPurchase | null> {
  await ensureCantinaDatabase();
  const record = await purchaseRecord(id);
  return record ? mapPurchase(record) : null;
}

export async function listSuppliers(): Promise<DemoSupplier[]> {
  await ensureCantinaDatabase();
  const suppliers = await prisma.supplier.findMany({
    include: { offers: { where: { active: true, category: "INFERENCE" }, take: 1 } },
    orderBy: { name: "asc" },
  });
  return suppliers.map((supplier: any) => ({
    id: supplier.id,
    slug: supplier.slug,
    name: supplier.name,
    description: supplier.description,
    regions: supplier.regions,
    reliabilityBps: supplier.reliabilityBps,
    privacyScore: supplier.privacyScore,
    complianceControls: supplier.complianceControls,
    priceMinor: supplier.offers[0]?.basePriceMinor ?? 0,
    estimatedDurationSeconds: supplier.offers[0]?.estimatedDurationSeconds ?? 0,
    completedJobs: supplier.completedJobs,
    failedJobs: supplier.failedJobs,
    reputationScoreBps: supplier.reputationScoreBps,
  }));
}

export async function listMandates() {
  await ensureCantinaDatabase();
  const mandates = await prisma.agentMandate.findMany({ orderBy: { createdAt: "asc" } });
  return mandates.map((mandate: any) => ({
    id: mandate.id,
    name: mandate.name,
    objective: mandate.objective,
    status: mandate.status,
    maximumPerJobMinor: mandate.maximumPerJobMinor,
    maximumPerDayMinor: mandate.maximumPerDayMinor,
    approvedCategories: mandate.approvedCategories,
    approvedRegions: mandate.approvedRegions,
    vendorAllowlist: mandate.vendorAllowlist,
    customerDataAllowed: mandate.customerDataAllowed,
    minimumReliabilityBps: mandate.minimumReliabilityBps,
    requireUsDataResidency: mandate.requireUsDataResidency,
    requireStrongPrivacyControls: mandate.requireStrongPrivacyControls,
    humanApprovalRequiredAboveMinor: mandate.humanApprovalRequiredAboveMinor,
  }));
}

export async function listTransactions(): Promise<DemoLedgerTransaction[]> {
  await ensureCantinaDatabase();
  const transactions = await prisma.ledgerTransaction.findMany({
    include: { entries: { include: { ledgerAccount: true } } },
    orderBy: { createdAt: "desc" },
  });
  return transactions.map((transaction: any) => ({
    id: transaction.id,
    type: transaction.type,
    idempotencyKey: transaction.idempotencyKey,
    referenceType: transaction.referenceType,
    referenceId: transaction.referenceId,
    description: transaction.description,
    currency: transaction.currency,
    createdAt: transaction.createdAt.toISOString(),
    entries: transaction.entries.map((entry: any) => ({
      id: entry.id,
      accountCode: entry.ledgerAccount.code,
      direction: entry.direction,
      amountMinor: entry.amountMinor,
      memo: entry.memo ?? undefined,
    })),
  }));
}

export async function listAuditEvents(): Promise<DemoAuditEvent[]> {
  await ensureCantinaDatabase();
  const events = await prisma.auditEvent.findMany({ orderBy: { sequence: "desc" } });
  return events.map((event: any) => ({
    id: event.id,
    sequence: Number(event.sequence),
    eventType: event.eventType,
    entityType: event.entityType,
    entityId: event.entityId,
    purchaseRequestId: event.purchaseRequestId ?? undefined,
    payload: json<Record<string, unknown>>(event.payload, {}),
    previousHash: event.previousHash,
    eventHash: event.eventHash,
    createdAt: event.createdAt.toISOString(),
  }));
}

export async function getDashboardData() {
  const { organization } = await demoContext();
  const [total, jobsCompleted, jobsFailed, activeMandates, recentRecords, transactions, suppliers, availableBalanceMinor, heldBalanceMinor] = await Promise.all([
    prisma.clearingDecision.aggregate({ where: { purchaseRequest: { organizationId: organization.id } }, _sum: { settledAmountMinor: true } }),
    prisma.job.count({ where: { purchaseRequest: { organizationId: organization.id }, status: "COMPLETED" } }),
    prisma.purchaseRequest.count({ where: { organizationId: organization.id, status: "FAILED" } }),
    prisma.agentMandate.count({ where: { organizationId: organization.id, status: "ACTIVE" } }),
    prisma.purchaseRequest.findMany({ where: { organizationId: organization.id }, orderBy: { createdAt: "desc" }, take: 6, select: { id: true } }),
    listTransactions(),
    listSuppliers(),
    accountBalanceMinor(prisma, `ORG:${organization.slug}:CUSTOMER_AVAILABLE`),
    accountBalanceMinor(prisma, `ORG:${organization.slug}:CUSTOMER_HELD`),
  ]);
  const recentPurchases = (await Promise.all(recentRecords.map((record: any) => getPurchase(record.id)))).filter(Boolean) as DemoPurchase[];
  return {
    organization: { id: organization.id, slug: organization.slug, name: organization.name },
    totalSpendMinor: total._sum.settledAmountMinor ?? 0,
    availableBalanceMinor,
    heldBalanceMinor,
    jobsCompleted,
    jobsFailed,
    activeMandates,
    recentPurchases,
    recentTransactions: transactions.slice(0, 6),
    suppliers,
  };
}
