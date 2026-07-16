import { createHash } from "node:crypto";
import type { SimulatedDeliveryOutcome } from "@/domain/clearing/settlement-plan";

export interface MockJobResult {
  output: {
    items: Array<{ id: number; title: string; description: string }>;
    supplier: string;
    generatedAt: string;
  };
  checksum: string;
  expectedItems: number;
}

export interface DeliveryVerification {
  status: "VERIFIED" | "PARTIAL" | "FAILED" | "DISPUTED";
  measuredItems: number;
  expectedItems: number;
  checksumVerified: boolean;
  checks: Record<string, boolean>;
}

function checksum(output: MockJobResult["output"]): string {
  return createHash("sha256").update(JSON.stringify(output)).digest("hex");
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
  return { output, checksum: checksum(output), expectedItems };
}

export function applySimulatedDeliveryOutcome(
  result: MockJobResult,
  outcome: SimulatedDeliveryOutcome,
): MockJobResult {
  if (outcome === "DELIVERED" || outcome === "DISPUTED") return result;

  const items = outcome === "FAILED"
    ? []
    : result.output.items.slice(0, Math.max(1, Math.floor(result.expectedItems * 0.7)));
  const output = { ...result.output, items };
  return { ...result, output, checksum: checksum(output) };
}

export function verifyMockDelivery(
  result: MockJobResult,
  options: { disputed?: boolean } = {},
): DeliveryVerification {
  const recalculated = checksum(result.output);
  const checksumVerified = recalculated === result.checksum;
  const measuredItems = result.output.items.length;
  const countComplete = measuredItems === result.expectedItems;
  const hasContent = result.output.items.every((item) => item.description.trim().length > 0);
  const status: DeliveryVerification["status"] = options.disputed
    ? "DISPUTED"
    : checksumVerified && countComplete && hasContent
      ? "VERIFIED"
      : measuredItems > 0
        ? "PARTIAL"
        : "FAILED";
  return {
    status,
    measuredItems,
    expectedItems: result.expectedItems,
    checksumVerified,
    checks: {
      checksumVerified,
      countComplete,
      hasContent,
      manualReviewRequired: Boolean(options.disputed),
    },
  };
}
