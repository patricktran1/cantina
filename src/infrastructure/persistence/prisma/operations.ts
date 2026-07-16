/* eslint-disable @typescript-eslint/no-explicit-any */
import { createHash } from "node:crypto";
import type { Prisma, PrismaClient } from "@/generated/prisma/client";
import { assertBalanced } from "@/domain/ledger/ledger";
import type { LedgerTransactionDraft } from "@/domain/ledger/types";

type DbClient = PrismaClient | Prisma.TransactionClient;

export async function postLedgerTransaction(db: DbClient, draft: LedgerTransactionDraft) {
  const existing = await db.ledgerTransaction.findUnique({
    where: { idempotencyKey: draft.idempotencyKey },
    include: { entries: { include: { ledgerAccount: true } } },
  });
  if (existing) return existing;

  assertBalanced(draft.postings);
  const accounts = await db.ledgerAccount.findMany({
    where: { code: { in: draft.postings.map((posting) => posting.accountCode) } },
  });
  const accountByCode = new Map(accounts.map((account: any) => [account.code, account.id]));
  const missing = draft.postings.filter((posting) => !accountByCode.has(posting.accountCode));
  if (missing.length) throw new Error(`Missing ledger accounts: ${missing.map((item) => item.accountCode).join(", ")}`);

  return db.ledgerTransaction.create({
    data: {
      type: draft.type,
      idempotencyKey: draft.idempotencyKey,
      referenceType: draft.referenceType,
      referenceId: draft.referenceId,
      description: draft.description,
      currency: draft.currency,
      entries: {
        create: draft.postings.map((posting) => ({
          ledgerAccountId: accountByCode.get(posting.accountCode)!,
          direction: posting.direction,
          amountMinor: posting.amountMinor,
          memo: posting.memo,
        })),
      },
    },
    include: { entries: { include: { ledgerAccount: true } } },
  });
}

export async function accountBalanceMinor(db: DbClient, accountCode: string): Promise<number> {
  const entries = await db.ledgerEntry.findMany({
    where: { ledgerAccount: { code: accountCode } },
    select: { direction: true, amountMinor: true },
  });
  return entries.reduce(
    (balance: number, entry: any) => balance + (entry.direction === "CREDIT" ? entry.amountMinor : -entry.amountMinor),
    0,
  );
}

export async function appendAudit(
  db: DbClient,
  input: {
    organizationId: string;
    purchaseRequestId?: string;
    actorUserId?: string;
    eventType: string;
    entityType: string;
    entityId: string;
    payload: Prisma.InputJsonValue;
  },
) {
  const previous = await db.auditEvent.findFirst({
    where: { organizationId: input.organizationId },
    orderBy: { sequence: "desc" },
  });
  const sequence = (previous?.sequence ?? BigInt(0)) + BigInt(1);
  const createdAt = new Date();
  const previousHash = previous?.eventHash ?? null;
  const hashPayload = JSON.stringify({
    sequence: sequence.toString(),
    previousHash,
    createdAt: createdAt.toISOString(),
    ...input,
  });
  const eventHash = createHash("sha256").update(hashPayload).digest("hex");

  return db.auditEvent.create({
    data: {
      ...input,
      sequence,
      previousHash,
      eventHash,
      createdAt,
    },
  });
}
