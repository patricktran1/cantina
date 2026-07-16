import { createInitialFunding } from "@/domain/ledger/ledger";
import { prisma } from "./client";
import { appendAudit, postLedgerTransaction } from "./operations";

const globalBootstrap = globalThis as unknown as { cantinaBootstrap?: Promise<void> };

async function bootstrap(): Promise<void> {
  const user = await prisma.user.upsert({
    where: { email: process.env.CANTINA_DEMO_USER_EMAIL ?? "founder@cantina.local" },
    update: {},
    create: {
      email: process.env.CANTINA_DEMO_USER_EMAIL ?? "founder@cantina.local",
      name: "Cantina Founder",
    },
  });

  const organization = await prisma.organization.upsert({
    where: { slug: process.env.CANTINA_DEMO_ORG_SLUG ?? "cantina-labs" },
    update: {},
    create: { name: "Cantina Labs", slug: process.env.CANTINA_DEMO_ORG_SLUG ?? "cantina-labs" },
  });

  await prisma.organizationMember.upsert({
    where: { userId_organizationId: { userId: user.id, organizationId: organization.id } },
    update: { role: "OWNER" },
    create: { userId: user.id, organizationId: organization.id, role: "OWNER" },
  });

  const agent = await prisma.agent.upsert({
    where: { id: "agent-cantina-demo" },
    update: { organizationId: organization.id, active: true },
    create: {
      id: "agent-cantina-demo",
      organizationId: organization.id,
      name: "Catalog Content Agent",
      externalReference: "demo-agent-001",
    },
  });

  await prisma.agentMandate.upsert({
    where: { id: "mandate-marketing-v1" },
    update: { organizationId: organization.id, agentId: agent.id },
    create: {
      id: "mandate-marketing-v1",
      organizationId: organization.id,
      agentId: agent.id,
      name: "Marketing Content Mandate",
      objective: "Generate marketing content",
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
    },
  });

  const suppliers = [
    {
      id: "supplier-atlas",
      slug: "atlas-gpu",
      name: "Atlas GPU",
      description: "Lowest-cost inference with broad regional coverage.",
      regions: ["us-west", "eu-west", "ap-southeast"],
      reliabilityBps: 9_700,
      privacyScore: 70,
      complianceControls: ["encryption-at-rest"],
      reputationScoreBps: 8_900,
      basePriceMinor: 18,
      estimatedDurationSeconds: 135,
    },
    {
      id: "supplier-nova",
      slug: "nova-compute",
      name: "Nova Compute",
      description: "Fast inference optimized for deadline-sensitive workloads.",
      regions: ["us-west", "us-central"],
      reliabilityBps: 9_900,
      privacyScore: 82,
      complianceControls: ["encryption-at-rest", "soc2"],
      reputationScoreBps: 9_500,
      basePriceMinor: 26,
      estimatedDurationSeconds: 52,
    },
    {
      id: "supplier-vault",
      slug: "vault-ai",
      name: "Vault AI",
      description: "Premium US-only processing with the strongest privacy controls.",
      regions: ["us-west", "us-central"],
      reliabilityBps: 9_990,
      privacyScore: 98,
      complianceControls: ["soc2", "private-networking", "zero-retention", "us-only"],
      reputationScoreBps: 9_900,
      basePriceMinor: 44,
      estimatedDurationSeconds: 100,
    },
  ];

  for (const supplierInput of suppliers) {
    const { basePriceMinor, estimatedDurationSeconds, ...supplierData } = supplierInput;
    const supplier = await prisma.supplier.upsert({
      where: { slug: supplierData.slug },
      update: supplierData,
      create: supplierData,
    });
    await prisma.supplierOffer.upsert({
      where: {
        supplierId_category_name: {
          supplierId: supplier.id,
          category: "INFERENCE",
          name: "Catalog generation v1",
        },
      },
      update: { basePriceMinor, estimatedDurationSeconds, regions: [...supplierData.regions], active: true },
      create: {
        supplierId: supplier.id,
        category: "INFERENCE",
        name: "Catalog generation v1",
        description: "Mock inference workload for the first Cantina vertical slice.",
        basePriceMinor,
        estimatedDurationSeconds,
        regions: [...supplierData.regions],
        metadata: { pricingModel: "fixed-demo-quote" },
      },
    });
  }

  const accountDefinitions = [
    [`ORG:${organization.slug}:CUSTOMER_AVAILABLE`, "Customer available balance", "LIABILITY", organization.id],
    [`ORG:${organization.slug}:CUSTOMER_HELD`, "Customer funds held", "LIABILITY", organization.id],
    ["SYSTEM:SUPPLIER_PAYABLE", "Supplier payable", "LIABILITY", null],
    ["SYSTEM:PLATFORM_REVENUE", "Platform revenue", "REVENUE", null],
    ["SYSTEM:REFUND_LIABILITY", "Refund liability", "LIABILITY", null],
    ["SYSTEM:SIMULATED_SETTLEMENT", "Simulated settlement account", "ASSET", null],
  ] as const;

  for (const [code, name, type, organizationId] of accountDefinitions) {
    await prisma.ledgerAccount.upsert({
      where: { code },
      update: {},
      create: { code, name, type, organizationId },
    });
  }

  await postLedgerTransaction(
    prisma,
    createInitialFunding({
      organizationSlug: organization.slug,
      amountMinor: 100_000,
      referenceId: organization.id,
      idempotencyKey: "seed:initial-funding",
    }),
  );

  const initialized = await prisma.auditEvent.findFirst({
    where: { organizationId: organization.id, eventType: "DEMO_ORGANIZATION_FUNDED" },
  });
  if (!initialized) {
    await appendAudit(prisma, {
      organizationId: organization.id,
      eventType: "DEMO_ORGANIZATION_FUNDED",
      entityType: "organization",
      entityId: organization.id,
      payload: { amountMinor: 100_000, currency: "USD" },
    });
  }
}

export async function ensureCantinaDatabase(): Promise<void> {
  globalBootstrap.cantinaBootstrap ??= bootstrap().catch((error) => {
    globalBootstrap.cantinaBootstrap = undefined;
    throw error;
  });
  return globalBootstrap.cantinaBootstrap;
}
