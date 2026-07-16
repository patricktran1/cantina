import { expect, it } from "vitest";
import { evaluateRequestAgainstMandate, evaluateSupplierQuote } from "./policy-engine";
import type { PurchaseRequestInput, PurchasingMandate, SupplierCandidate } from "./types";

const mandate: PurchasingMandate = {
  id: "mandate-1",
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
};

const request: PurchaseRequestInput = {
  taskDescription: "Generate 100 product descriptions.",
  maximumBudgetMinor: 30,
  deadlineSeconds: 180,
  category: "INFERENCE",
  allowedRegions: ["us-west", "us-central"],
  minimumReliabilityBps: 9_900,
  customerDataIncluded: false,
  requireUsDataResidency: true,
  requireStrongPrivacyControls: false,
  humanApprovalThresholdMinor: 2_500,
  simulatedOutcome: "DELIVERED",
};

it("accepts a request inside its mandate", () => {
  expect(evaluateRequestAgainstMandate({ request, mandate, spentTodayMinor: 0 }).compliant).toBe(true);
});

it("rejects a supplier below the reliability floor", () => {
  const supplier: SupplierCandidate = {
    supplierId: "atlas",
    supplierSlug: "atlas-gpu",
    supplierName: "Atlas GPU",
    offerId: "offer",
    priceMinor: 18,
    estimatedDurationSeconds: 135,
    reliabilityBps: 9_700,
    regions: ["us-west", "eu-west"],
    privacyScore: 70,
    complianceControls: ["encryption-at-rest"],
  };
  const result = evaluateSupplierQuote({ request, mandate, supplier });
  expect(result.compliant).toBe(false);
  expect(result.checks.find((item) => item.code === "RELIABILITY")?.passed).toBe(false);
});
