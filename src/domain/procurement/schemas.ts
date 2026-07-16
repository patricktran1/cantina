import { z } from "zod";
import { resourceCategories } from "./types";
import { simulatedDeliveryOutcomes } from "@/domain/clearing/settlement-plan";

export const purchaseRequestSchema = z.object({
  taskDescription: z.string().trim().min(10).max(10_000),
  maximumBudgetMinor: z.coerce.number().int().positive().max(10_000_000),
  deadlineSeconds: z.coerce.number().int().min(1).max(86_400),
  category: z.enum(resourceCategories),
  allowedRegions: z.array(z.string().trim().min(1)).min(1),
  minimumReliabilityBps: z.coerce.number().int().min(0).max(10_000),
  customerDataIncluded: z.boolean(),
  requireUsDataResidency: z.boolean(),
  requireStrongPrivacyControls: z.boolean(),
  humanApprovalThresholdMinor: z.coerce.number().int().nonnegative().max(100_000_000),
  simulatedOutcome: z.enum(simulatedDeliveryOutcomes).default("DELIVERED"),
  idempotencyKey: z.string().trim().min(8).max(200),
});

export type ValidatedPurchaseRequest = z.infer<typeof purchaseRequestSchema>;
