import { evaluateSupplierQuote } from "./policy-engine";
import type {
  EvaluatedQuote,
  PurchaseRequestInput,
  PurchaseSelection,
  PurchasingMandate,
  SupplierCandidate,
} from "./types";

function scoreQuote(quote: SupplierCandidate): number {
  const reliabilityPenalty = Math.max(0, 10_000 - quote.reliabilityBps);
  const privacyPenalty = Math.max(0, 100 - quote.privacyScore) * 5;
  return quote.priceMinor * 100 + quote.estimatedDurationSeconds + reliabilityPenalty + privacyPenalty;
}

export function evaluateAndRankSuppliers(args: {
  request: PurchaseRequestInput;
  mandate: PurchasingMandate;
  suppliers: SupplierCandidate[];
}): EvaluatedQuote[] {
  return args.suppliers
    .map((supplier): EvaluatedQuote => {
      const compliance = evaluateSupplierQuote({ ...args, supplier });
      return {
        ...supplier,
        selectedRegion: compliance.selectedRegion,
        compliance: { compliant: compliance.compliant, checks: compliance.checks },
        score: compliance.compliant ? scoreQuote(supplier) : null,
      };
    })
    .sort((left, right) => {
      if (left.compliance.compliant !== right.compliance.compliant) {
        return left.compliance.compliant ? -1 : 1;
      }
      return (left.score ?? Number.MAX_SAFE_INTEGER) - (right.score ?? Number.MAX_SAFE_INTEGER);
    });
}

export function selectSupplier(args: {
  request: PurchaseRequestInput;
  mandate: PurchasingMandate;
  evaluatedQuotes: EvaluatedQuote[];
}): PurchaseSelection {
  const selected = args.evaluatedQuotes.find((quote) => quote.compliance.compliant) ?? null;

  if (!selected) {
    return {
      selected: null,
      rationale: "No supplier satisfied every deterministic budget, deadline, reliability, region, vendor, and privacy rule.",
      requiresHumanApproval: false,
    };
  }

  const threshold = Math.min(
    args.request.humanApprovalThresholdMinor,
    args.mandate.humanApprovalRequiredAboveMinor,
  );
  const requiresHumanApproval = selected.priceMinor > threshold;
  const rationale = `${selected.supplierName} is the highest-ranked compliant quote at ${selected.priceMinor} minor units, ` +
    `${selected.estimatedDurationSeconds} seconds estimated completion, and ${(selected.reliabilityBps / 100).toFixed(2)}% reliability. ` +
    "Non-compliant suppliers were excluded before scoring.";

  return { selected, rationale, requiresHumanApproval };
}
