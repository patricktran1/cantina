import { PurchaseRequestForm } from "@/components/purchase-request-form";
import { SectionHeading } from "@/components/section-heading";

export default function NewPurchaseRequestPage() {
  return (
    <div>
      <SectionHeading
        eyebrow="New purchase request"
        title="Issue an agent purchasing mandate"
        description="Cantina will enforce hard constraints, compare supplier quotes, authorize credits, execute the mock workload, verify delivery, and settle the ledger."
      />
      <PurchaseRequestForm />
    </div>
  );
}
