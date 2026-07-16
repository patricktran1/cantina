import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Check, CircleDollarSign, Clock, FileCheck2, Gauge, ShieldCheck, X } from "lucide-react";
import { SectionHeading } from "@/components/section-heading";
import { StatusPill } from "@/components/status-pill";
import { getPurchase } from "@/lib/store";
import { formatDateTime, formatMinorUnits, formatPercentBps } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function PurchaseResultPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const purchase = await getPurchase(id);
  if (!purchase) notFound();

  return (
    <div>
      <Link href="/" className="mb-5 inline-flex items-center gap-2 text-sm text-zinc-500 hover:text-white"><ArrowLeft className="size-4" /> Dashboard</Link>
      <SectionHeading
        eyebrow="Purchase decision"
        title="Procurement workflow result"
        description={purchase.taskDescription}
        action={<StatusPill status={purchase.status} />}
      />

      <div className="mt-7 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {[
          ["Selected supplier", purchase.decision.selectedSupplierName ?? "None", ShieldCheck],
          ["Authorized", formatMinorUnits(purchase.authorization?.amountMinor ?? 0), CircleDollarSign],
          ["Expected completion", purchase.quotes.find((quote) => quote.supplierId === purchase.decision.selectedSupplierId)?.estimatedDurationSeconds ? `${purchase.quotes.find((quote) => quote.supplierId === purchase.decision.selectedSupplierId)?.estimatedDurationSeconds}s` : "—", Clock],
          ["Delivery", purchase.verification?.status ?? "Not executed", FileCheck2],
          ["Clearing scenario", purchase.simulatedOutcome, Gauge],
        ].map(([label, value, Icon]) => {
          const Lucide = Icon as typeof ShieldCheck;
          return (
            <div key={String(label)} className="rounded-xl border border-white/8 bg-[#0d1218] p-4">
              <Lucide className="size-4 text-zinc-500" />
              <div className="mt-4 text-xs uppercase tracking-[0.14em] text-zinc-600">{String(label)}</div>
              <div className="mt-1 text-sm font-medium text-zinc-200">{String(value)}</div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.35fr_0.65fr]">
        <section className="overflow-hidden rounded-2xl border border-white/8 bg-[#0d1218]">
          <div className="border-b border-white/8 px-5 py-4">
            <h2 className="font-semibold">Supplier comparison</h2>
            <p className="mt-1 text-xs text-zinc-500">Hard policy filters run before deterministic scoring</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="border-b border-white/8 text-xs uppercase tracking-[0.12em] text-zinc-600">
                <tr>
                  <th className="px-5 py-3 font-medium">Supplier</th>
                  <th className="px-5 py-3 font-medium">Quote</th>
                  <th className="px-5 py-3 font-medium">Speed</th>
                  <th className="px-5 py-3 font-medium">Reliability</th>
                  <th className="px-5 py-3 font-medium">Region</th>
                  <th className="px-5 py-3 font-medium">Policy</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/6">
                {purchase.quotes.map((quote) => (
                  <tr key={quote.supplierId} className={quote.supplierId === purchase.decision.selectedSupplierId ? "bg-lime-300/[0.035]" : ""}>
                    <td className="px-5 py-4">
                      <div className="font-medium text-zinc-200">{quote.supplierName}</div>
                      {quote.supplierId === purchase.decision.selectedSupplierId ? <div className="mt-1 text-xs text-lime-300">Selected</div> : null}
                    </td>
                    <td className="px-5 py-4 tabular-nums text-zinc-300">{formatMinorUnits(quote.priceMinor)}</td>
                    <td className="px-5 py-4 text-zinc-400">{quote.estimatedDurationSeconds}s</td>
                    <td className="px-5 py-4 text-zinc-400">{formatPercentBps(quote.reliabilityBps)}</td>
                    <td className="px-5 py-4 text-zinc-400">{quote.selectedRegion ?? "No match"}</td>
                    <td className="px-5 py-4"><StatusPill status={quote.compliance.compliant ? "COMPLIANT" : "NON_COMPLIANT"} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-2xl border border-white/8 bg-[#0d1218] p-5">
          <h2 className="font-semibold">Selection rationale</h2>
          <p className="mt-4 text-sm leading-6 text-zinc-400">{purchase.decision.rationale}</p>
          <div className="mt-5 border-t border-white/8 pt-5">
            <div className="flex items-center justify-between text-sm">
              <span className="text-zinc-500">Approval status</span>
              <StatusPill status={purchase.decision.status} />
            </div>
            <div className="mt-4 flex items-center justify-between text-sm">
              <span className="text-zinc-500">Created</span>
              <span className="text-zinc-300">{formatDateTime(purchase.createdAt)}</span>
            </div>
          </div>
        </section>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <section className="rounded-2xl border border-white/8 bg-[#0d1218] p-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold">Policy evaluation</h2>
              <p className="mt-1 text-xs text-zinc-500">Request-level mandate controls</p>
            </div>
            <StatusPill status={purchase.mandateEvaluation.compliant ? "COMPLIANT" : "NON_COMPLIANT"} />
          </div>
          <div className="mt-5 space-y-3">
            {purchase.mandateEvaluation.checks.map((item) => (
              <div key={item.code} className="flex gap-3 rounded-lg border border-white/7 bg-white/[0.02] p-3">
                {item.passed ? <Check className="mt-0.5 size-4 shrink-0 text-emerald-300" /> : <X className="mt-0.5 size-4 shrink-0 text-rose-300" />}
                <div>
                  <div className="text-xs font-medium text-zinc-300">{item.code.replaceAll("_", " ")}</div>
                  <div className="mt-1 text-xs leading-5 text-zinc-600">{item.message}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-white/8 bg-[#0d1218] p-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold">Execution and clearing</h2>
              <p className="mt-1 text-xs text-zinc-500">Delivery evidence determines payment behavior</p>
            </div>
            <StatusPill status={purchase.clearing?.state ?? purchase.status} />
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-white/7 bg-white/[0.02] p-4">
              <Gauge className="size-4 text-zinc-500" />
              <div className="mt-3 text-xs text-zinc-600">Workload progress</div>
              <div className="mt-1 text-xl font-semibold">{purchase.job?.progressPercent ?? 0}%</div>
            </div>
            <div className="rounded-lg border border-white/7 bg-white/[0.02] p-4">
              <FileCheck2 className="size-4 text-zinc-500" />
              <div className="mt-3 text-xs text-zinc-600">Verified outputs</div>
              <div className="mt-1 text-xl font-semibold">{purchase.verification?.measuredItems ?? 0}/{purchase.verification?.expectedItems ?? 0}</div>
            </div>
          </div>
          {purchase.clearing ? (
            <div className="mt-4 rounded-lg border border-white/10 bg-white/[0.025] p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm font-medium text-zinc-200">{purchase.clearing.rationale}</div>
                <StatusPill status={purchase.clearing.settlementStatus} />
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 text-xs text-zinc-500 sm:grid-cols-4">
                <span>Authorized: {formatMinorUnits(purchase.clearing.authorizedAmountMinor)}</span>
                <span>Captured: {formatMinorUnits(purchase.clearing.settledAmountMinor)}</span>
                <span>Released: {formatMinorUnits(purchase.clearing.refundedAmountMinor)}</span>
                <span>Platform fee: {formatMinorUnits(purchase.clearing.platformFeeMinor)}</span>
              </div>
            </div>
          ) : null}
        </section>
      </div>

      {purchase.job ? (
        <section className="mt-6 rounded-2xl border border-white/8 bg-[#0d1218] p-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold">Mock workload output</h2>
              <p className="mt-1 text-xs text-zinc-500">Showing the first five of {purchase.job.output.items.length} generated items</p>
            </div>
            <StatusPill status={purchase.job.status} />
          </div>
          <div className="mt-5 grid gap-3 lg:grid-cols-5">
            {purchase.job.output.items.slice(0, 5).map((item) => (
              <div key={item.id} className="rounded-lg border border-white/7 bg-white/[0.02] p-4">
                <div className="text-xs font-medium text-lime-300">{item.title}</div>
                <p className="mt-2 text-xs leading-5 text-zinc-500">{item.description}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 break-all font-mono text-[10px] text-zinc-700">SHA-256 {purchase.job.checksum}</div>
        </section>
      ) : null}
    </div>
  );
}
