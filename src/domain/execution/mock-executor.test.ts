import { describe, expect, it } from "vitest";
import { applySimulatedDeliveryOutcome, executeMockJob, verifyMockDelivery } from "./mock-executor";

describe("mock execution verification", () => {
  const base = () => executeMockJob({
    taskDescription: "Generate 100 product descriptions.",
    supplierName: "Nova Compute",
  });

  it("generates and verifies the requested item count", () => {
    const result = base();
    const verification = verifyMockDelivery(result);
    expect(result.output.items).toHaveLength(100);
    expect(verification.status).toBe("VERIFIED");
  });

  it("simulates partial and failed delivery evidence", () => {
    const partial = applySimulatedDeliveryOutcome(base(), "PARTIAL");
    const failed = applySimulatedDeliveryOutcome(base(), "FAILED");
    expect(verifyMockDelivery(partial).status).toBe("PARTIAL");
    expect(verifyMockDelivery(failed).status).toBe("FAILED");
  });

  it("flags a technically complete delivery for dispute review", () => {
    const result = applySimulatedDeliveryOutcome(base(), "DISPUTED");
    expect(verifyMockDelivery(result, { disputed: true }).status).toBe("DISPUTED");
  });
});
