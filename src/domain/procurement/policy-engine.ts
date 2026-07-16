import type {
  PolicyCheck,
  PolicyEvaluation,
  PurchaseRequestInput,
  PurchasingMandate,
  SupplierCandidate,
} from "./types";

function check(code: string, passed: boolean, message: string): PolicyCheck {
  return { code, passed, message };
}

function intersection(left: string[], right: string[]): string[] {
  const allowed = new Set(right);
  return left.filter((value) => allowed.has(value));
}

export function evaluateRequestAgainstMandate(args: {
  request: PurchaseRequestInput;
  mandate: PurchasingMandate;
  spentTodayMinor: number;
}): PolicyEvaluation {
  const { request, mandate, spentTodayMinor } = args;
  const effectiveRegions = intersection(request.allowedRegions, mandate.approvedRegions);

  const checks: PolicyCheck[] = [
    check("MANDATE_ACTIVE", mandate.status === "ACTIVE", "Purchasing mandate must be active."),
    check(
      "PER_JOB_LIMIT",
      request.maximumBudgetMinor <= mandate.maximumPerJobMinor,
      `Request budget must not exceed the mandate per-job limit of ${mandate.maximumPerJobMinor} minor units.`,
    ),
    check(
      "DAILY_LIMIT",
      spentTodayMinor + request.maximumBudgetMinor <= mandate.maximumPerDayMinor,
      "Request budget must fit inside the remaining daily spending limit.",
    ),
    check(
      "CATEGORY_APPROVED",
      mandate.approvedCategories.includes(request.category),
      `Resource category ${request.category} must be approved by the mandate.`,
    ),
    check(
      "REGION_OVERLAP",
      effectiveRegions.length > 0,
      "Request regions must overlap the mandate-approved regions.",
    ),
    check(
      "CUSTOMER_DATA",
      !request.customerDataIncluded || mandate.customerDataAllowed,
      "Customer data may only be used when the mandate explicitly permits it.",
    ),
    check(
      "US_RESIDENCY",
      !mandate.requireUsDataResidency || request.requireUsDataResidency,
      "The request must preserve the mandate's US data residency requirement.",
    ),
    check(
      "PRIVACY_CONTROLS",
      !mandate.requireStrongPrivacyControls || request.requireStrongPrivacyControls,
      "The request must preserve the mandate's strong privacy requirement.",
    ),
  ];

  return { compliant: checks.every((item) => item.passed), checks };
}

export function evaluateSupplierQuote(args: {
  request: PurchaseRequestInput;
  mandate: PurchasingMandate;
  supplier: SupplierCandidate;
}): PolicyEvaluation & { selectedRegion: string | null } {
  const { request, mandate, supplier } = args;
  const approvedRequestRegions = intersection(request.allowedRegions, mandate.approvedRegions);
  const supplierRegions = intersection(supplier.regions, approvedRequestRegions);
  const selectedRegion = supplierRegions[0] ?? null;
  const requiredReliability = Math.max(request.minimumReliabilityBps, mandate.minimumReliabilityBps);
  const vendorAllowed =
    mandate.vendorAllowlist.length === 0 || mandate.vendorAllowlist.includes(supplier.supplierSlug);
  const hasStrongPrivacy = supplier.privacyScore >= 90 && supplier.complianceControls.length > 0;
  const selectedRegionIsUs = selectedRegion?.startsWith("us-") ?? false;

  const checks: PolicyCheck[] = [
    check("BUDGET", supplier.priceMinor <= request.maximumBudgetMinor, "Quote must fit within the request budget."),
    check(
      "DEADLINE",
      supplier.estimatedDurationSeconds <= request.deadlineSeconds,
      "Supplier must meet the requested completion deadline.",
    ),
    check(
      "RELIABILITY",
      supplier.reliabilityBps >= requiredReliability,
      `Supplier reliability must be at least ${requiredReliability} basis points.`,
    ),
    check("REGION", selectedRegion !== null, "Supplier must offer an approved processing region."),
    check("VENDOR_ALLOWLIST", vendorAllowed, "Supplier must be included in the mandate vendor allowlist."),
    check(
      "US_DATA_RESIDENCY",
      !(request.requireUsDataResidency || mandate.requireUsDataResidency) || selectedRegionIsUs,
      "Supplier must execute in a US region.",
    ),
    check(
      "PRIVACY",
      !(request.requireStrongPrivacyControls || mandate.requireStrongPrivacyControls) || hasStrongPrivacy,
      "Supplier must satisfy strong privacy controls.",
    ),
  ];

  return { compliant: checks.every((item) => item.passed), checks, selectedRegion };
}
