import { describe, expect, it } from "vitest";
import { executeMockJob, verifyMockDelivery } from "./mock-executor";

describe("mock execution verification", () => {
  it("generates and verifies the requested item count", () => {
    const result = executeMockJob({
      taskDescription: "Generate 100 product descriptions.",
      supplierName: "Nova Compute",
    });
    const verification = verifyMockDelivery(result);
    expect(result.output.items).toHaveLength(100);
    expect(verification.status).toBe("VERIFIED");
  });
});
