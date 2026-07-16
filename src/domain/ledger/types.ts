export type EntryDirection = "DEBIT" | "CREDIT";

export interface LedgerPosting {
  accountCode: string;
  direction: EntryDirection;
  amountMinor: number;
  memo?: string;
}

export interface LedgerTransactionDraft {
  type:
    | "FUNDING"
    | "AUTHORIZATION_HOLD"
    | "CAPTURE"
    | "HOLD_RELEASE"
    | "REFUND"
    | "SUPPLIER_SETTLEMENT"
    | "PLATFORM_FEE"
    | "ADJUSTMENT";
  idempotencyKey: string;
  referenceType: string;
  referenceId: string;
  description: string;
  currency: string;
  postings: LedgerPosting[];
}
