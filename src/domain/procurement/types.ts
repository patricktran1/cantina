import type { SimulatedDeliveryOutcome } from "@/domain/clearing/settlement-plan";

export const resourceCategories = [
  "INFERENCE",
  "COMPUTE",
  "STORAGE",
  "DATABASE",
  "SEARCH",
  "BROWSER_AUTOMATION",
  "VOICE",
  "IMAGE",
  "VIDEO",
  "DATASET",
  "SOFTWARE_TOOL",
  "SPECIALIZED_AGENT",
] as const;

export type ResourceCategory = (typeof resourceCategories)[number];

export interface PurchasingMandate {
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
}

export interface PurchaseRequestInput {
  taskDescription: string;
  maximumBudgetMinor: number;
  deadlineSeconds: number;
  category: ResourceCategory;
  allowedRegions: string[];
  minimumReliabilityBps: number;
  customerDataIncluded: boolean;
  requireUsDataResidency: boolean;
  requireStrongPrivacyControls: boolean;
  humanApprovalThresholdMinor: number;
  simulatedOutcome: SimulatedDeliveryOutcome;
}

export interface SupplierCandidate {
  supplierId: string;
  supplierSlug: string;
  supplierName: string;
  offerId: string;
  priceMinor: number;
  estimatedDurationSeconds: number;
  reliabilityBps: number;
  regions: string[];
  privacyScore: number;
  complianceControls: string[];
}

export interface PolicyCheck {
  code: string;
  passed: boolean;
  message: string;
}

export interface PolicyEvaluation {
  compliant: boolean;
  checks: PolicyCheck[];
}

export interface EvaluatedQuote extends SupplierCandidate {
  selectedRegion: string | null;
  compliance: PolicyEvaluation;
  score: number | null;
}

export interface PurchaseSelection {
  selected: EvaluatedQuote | null;
  rationale: string;
  requiresHumanApproval: boolean;
}
