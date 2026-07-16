import Link from "next/link";
import { Activity, ArrowRight, CircleDollarSign, Clock3, ListChecks, ShieldAlert, WalletCards } from "lucide-react";
import { SectionHeading } from "@/components/section-heading";
import { StatCard } from "@/components/stat-card";
import { StatusPill } from "@/components/status-pill";
import { getDashboardData } from "@/lib/store";
import { formatDateTime, formatMinorUnits, formatPercentBps } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const data = await getDashboardData();
  return (
    <div>
      <SectionHeading
        eyebrow="Network overview"
        title="Agent procurement control plane"
        description="A deterministic command center for supplier discovery, policy enforcement, workload verification, clearing, and settlement."
        action={
          <Link href="/purchase-requests/new" className="inline-flex items-center gap-2 rounded-lg bg-lime-300 px-4 py-2.5 text-sm font-semibold text-black hover:bg-lime-200">
            New purchase <ArrowRight className="size-4" />
          </Link>
        }
      />

      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard label="Total agent spend" value={formatMinorUnits(data.totalSpendMinor)} note="Verified and settled" icon={CircleDollarSign} />
        <StatCard label="Available credits" value={formatMinorUnits(data.availableBalanceMinor)} note={`${formatMinorUnits(data.heldBalanceMinor)} currently held`} icon={WalletCards} />
        <StatCard label="Jobs completed" value={String(data.jobsCompleted)} note="Mock workloads verified" icon={ListChecks} />
        <StatCard label="Jobs failed" value={String(data.jobsFailed)} note="Refund path ready" icon={ShieldAlert} />
        <StatCard label="Active mandates" value={String(data.activeMandates)} note="Deterministic policy sets" icon={Activity} />
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
        <section className="overflow-hidden rounded-2xl border border-white/8 bg-[#0d1218]">
          <div className="flex items-center justify-between border-b border-white/8 px-5 py-4">
            <div>
              <h2 className="font-semibold">Recent purchase requests</h2>
              <p className="mt-1 text-xs text-zinc-500">Decision, execution, and clearing outcomes</p>
            </div>
            <Link href="/purchase-requests/new" className="text-xs font-medium text-lime-300">Create request</Link>
          </div>
          {data.recentPurchases.length === 0 ? (
            <div className="px-5 py-16 text-center">
              <div className="mx-auto grid size-11 place-items-center rounded-xl bg-white/5"><Clock3 className="size-5 text-zinc-500" /></div>
              <h3 className="mt-4 text-sm font-medium">No procurement history yet</h3>
              <p className="mt-2 text-sm text-zinc-600">Run the seeded three-supplier decision flow to populate the network.</p>
            </div>
          ) : (
            <div className="divide-y divide-white/6">
              {data.recentPurchases.map((purchase) => (
                <Link key={purchase.id} href={`/purchase-requests/${purchase.id}`} className="grid gap-3 px-5 py-4 transition hover:bg-white/[0.025] sm:grid-cols-[1fr_auto_auto] sm:items-center">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-zinc-200">{purchase.taskDescription}</div>
                    <div className="mt-1 text-xs text-zinc-600">{formatDateTime(purchase.createdAt)} · {purchase.decision.selectedSupplierName ?? "No supplier"}</div>
                  </div>
                  <div className="text-sm text-zinc-300">{formatMinorUnits(purchase.clearing?.settledAmountMinor ?? 0)}</div>
                  <StatusPill status={purchase.status} />
                </Link>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-white/8 bg-[#0d1218] p-5">
          <div>
            <h2 className="font-semibold">Supplier performance</h2>
            <p className="mt-1 text-xs text-zinc-500">Seeded marketplace health</p>
          </div>
          <div className="mt-5 space-y-4">
            {data.suppliers.map((supplier) => (
              <div key={supplier.id} className="rounded-xl border border-white/7 bg-white/[0.02] p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="font-medium text-zinc-200">{supplier.name}</div>
                  <div className="text-xs text-zinc-500">{formatPercentBps(supplier.reliabilityBps)} reliable</div>
                </div>
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/5">
                  <div className="h-full rounded-full bg-lime-300/70" style={{ width: `${supplier.reputationScoreBps / 100}%` }} />
                </div>
                <div className="mt-3 flex justify-between text-xs text-zinc-600">
                  <span>{supplier.completedJobs} completed</span>
                  <span>{supplier.failedJobs} failed</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="mt-6 overflow-hidden rounded-2xl border border-white/8 bg-[#0d1218]">
        <div className="border-b border-white/8 px-5 py-4">
          <h2 className="font-semibold">Recent ledger activity</h2>
        </div>
        <div className="divide-y divide-white/6">
          {data.recentTransactions.map((transaction) => (
            <div key={transaction.id} className="grid gap-2 px-5 py-4 sm:grid-cols-[180px_1fr_auto] sm:items-center">
              <div><StatusPill status={transaction.type} /></div>
              <div>
                <div className="text-sm text-zinc-300">{transaction.description}</div>
                <div className="mt-1 text-xs text-zinc-600">{formatDateTime(transaction.createdAt)}</div>
              </div>
              <div className="text-sm tabular-nums text-zinc-300">
                {formatMinorUnits(transaction.entries.filter((entry) => entry.direction === "DEBIT").reduce((sum, entry) => sum + entry.amountMinor, 0))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
