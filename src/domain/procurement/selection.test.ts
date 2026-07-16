import { describe, expect, it } from "vitest";
import { evaluateAndRankSuppliers, selectSupplier } from "./selection";
import type { PurchaseRequestInput, PurchasingMandate, SupplierCandidate } from "./types";

const mandate: PurchasingMandate = {
  id: "mandate-1",
  status: "ACTIVE",
  maximumPerJobMinor: 500,
  maximumPerDayMinor: 10_000,
  approvedCategories: ["INFERENCE"],
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

const suppliers: SupplierCandidate[] = [
  {
    supplierId: "atlas",
    supplierSlug: "atlas-gpu",
    supplierName: "Atlas GPU",
    offerId: "atlas-offer",
    priceMinor: 18,
    estimatedDurationSeconds: 135,
    reliabilityBps: 9_700,
    regions: ["us-west", "eu-west"],
    privacyScore: 70,
    complianceControls: ["encryption-at-rest"],
  },
  {
    supplierId: "nova",
    supplierSlug: "nova-compute",
    supplierName: "Nova Compute",
    offerId: "nova-offer",
    priceMinor: 26,
    estimatedDurationSeconds: 52,
    reliabilityBps: 9_900,
    regions: ["us-west"],
    privacyScore: 82,
    complianceControls: ["encryption-at-rest", "soc2"],
  },
  {
    supplierId: "vault",
    supplierSlug: "vault-ai",
    supplierName: "Vault AI",
    offerId: "vault-offer",
    priceMinor: 44,
    estimatedDurationSeconds: 100,
    reliabilityBps: 9_990,
    regions: ["us-west", "us-central"],
    privacyScore: 98,
    complianceControls: ["soc2", "private-networking", "zero-retention"],
  },
];

describe("supplier selection", () => {
  it("selects Nova when Atlas fails reliability and Vault exceeds budget", () => {
    const evaluatedQuotes = evaluateAndRankSuppliers({ request, mandate, suppliers });
    const selection = selectSupplier({ request, mandate, evaluatedQuotes });
    expect(selection.selected?.supplierName).toBe("Nova Compute");
  });
});
