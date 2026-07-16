import type { ValidatedPurchaseRequest } from "@/domain/procurement/schemas";
import type {
  DemoAuditEvent,
  DemoLedgerTransaction,
  DemoPurchase,
  DemoSupplier,
} from "@/lib/demo-store";
import * as memoryStore from "@/lib/demo-store";

const useDatabase = Boolean(process.env.DATABASE_URL);

type DashboardData = ReturnType<typeof memoryStore.getDashboardData>;
type MandateList = ReturnType<typeof memoryStore.listMandates>;

async function implementation() {
  return useDatabase ? import("@/infrastructure/persistence/database-store") : memoryStore;
}

export async function createAndRunPurchase(input: ValidatedPurchaseRequest): Promise<DemoPurchase> {
  const store = await implementation();
  return store.createAndRunPurchase(input);
}

export async function getDashboardData(): Promise<DashboardData> {
  const store = await implementation();
  return store.getDashboardData() as Promise<DashboardData> | DashboardData;
}

export async function listSuppliers(): Promise<DemoSupplier[]> {
  const store = await implementation();
  return store.listSuppliers();
}

export async function listMandates(): Promise<MandateList> {
  const store = await implementation();
  return store.listMandates() as Promise<MandateList> | MandateList;
}

export async function listTransactions(): Promise<DemoLedgerTransaction[]> {
  const store = await implementation();
  return store.listTransactions();
}

export async function listAuditEvents(): Promise<DemoAuditEvent[]> {
  const store = await implementation();
  return store.listAuditEvents();
}

export async function getPurchase(id: string): Promise<DemoPurchase | null> {
  const store = await implementation();
  return store.getPurchase(id);
}
