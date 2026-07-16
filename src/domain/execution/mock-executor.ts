import { createHash } from "node:crypto";

export interface MockJobResult {
  output: {
    items: Array<{ id: number; title: string; description: string }>;
    supplier: string;
    generatedAt: string;
  };
  checksum: string;
  expectedItems: number;
}

export function inferRequestedItemCount(taskDescription: string): number {
  const match = taskDescription.match(/\b(\d{1,4})\b/);
  const parsed = match ? Number.parseInt(match[1], 10) : 10;
  return Math.min(Math.max(parsed, 1), 500);
}

export function executeMockJob(args: { taskDescription: string; supplierName: string }): MockJobResult {
  const expectedItems = inferRequestedItemCount(args.taskDescription);
  const items = Array.from({ length: expectedItems }, (_, index) => ({
    id: index + 1,
    title: `Product ${index + 1}`,
    description: `Clear, benefit-led product description ${index + 1}, fulfilled through ${args.supplierName}.`,
  }));
  const output = {
    items,
    supplier: args.supplierName,
    generatedAt: new Date().toISOString(),
  };
  const checksum = createHash("sha256").update(JSON.stringify(output)).digest("hex");
  return { output, checksum, expectedItems };
}

export function verifyMockDelivery(result: MockJobResult): {
  status: "VERIFIED" | "PARTIAL" | "FAILED";
  measuredItems: number;
  expectedItems: number;
  checksumVerified: boolean;
  checks: Record<string, boolean>;
} {
  const recalculated = createHash("sha256").update(JSON.stringify(result.output)).digest("hex");
  const checksumVerified = recalculated === result.checksum;
  const measuredItems = result.output.items.length;
  const countComplete = measuredItems === result.expectedItems;
  const hasContent = result.output.items.every((item) => item.description.trim().length > 0);
  const status = checksumVerified && countComplete && hasContent
    ? "VERIFIED"
    : measuredItems > 0
      ? "PARTIAL"
      : "FAILED";
  return {
    status,
    measuredItems,
    expectedItems: result.expectedItems,
    checksumVerified,
    checks: { checksumVerified, countComplete, hasContent },
  };
}
