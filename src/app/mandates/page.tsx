import { Check, Pause, ShieldCheck } from "lucide-react";
import { SectionHeading } from "@/components/section-heading";
import { StatusPill } from "@/components/status-pill";
import { listMandates } from "@/lib/store";
import { formatMinorUnits, formatPercentBps } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function MandatesPage() {
  const mandates = await listMandates();
  return (
    <div>
      <SectionHeading eyebrow="Policy control plane" title="Purchasing mandates" description="Deterministic policies define what an agent may buy. LLM output can explain or recommend, but it cannot bypass these controls." />
      <div className="mt-8 space-y-5">
        {mandates.map((mandate) => (
          <section key={mandate.id} className="rounded-2xl border border-white/8 bg-[#0d1218] p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="flex items-center gap-3"><ShieldCheck className="size-5 text-lime-300" /><h2 className="text-lg font-semibold">{mandate.name}</h2></div>
                <p className="mt-2 text-sm text-zinc-500">{mandate.objective}</p>
              </div>
              <StatusPill status={mandate.status} />
            </div>
            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[
                ["Per-job ceiling", formatMinorUnits(mandate.maximumPerJobMinor)],
                ["Daily ceiling", formatMinorUnits(mandate.maximumPerDayMinor)],
                ["Reliability floor", formatPercentBps(mandate.minimumReliabilityBps)],
                ["Human approval", `Above ${formatMinorUnits(mandate.humanApprovalRequiredAboveMinor)}`],
              ].map(([label, value]) => (
                <div key={label} className="rounded-lg border border-white/7 bg-white/[0.02] p-4"><div className="text-xs text-zinc-600">{label}</div><div className="mt-1 text-sm font-medium text-zinc-200">{value}</div></div>
              ))}
            </div>
            <div className="mt-6 grid gap-5 lg:grid-cols-3">
              <div><div className="text-xs uppercase tracking-[0.14em] text-zinc-600">Approved categories</div><div className="mt-3 flex flex-wrap gap-2">{mandate.approvedCategories.map((item) => <span key={item} className="rounded-full border border-white/8 px-2.5 py-1 text-xs text-zinc-400">{item}</span>)}</div></div>
              <div><div className="text-xs uppercase tracking-[0.14em] text-zinc-600">Approved regions</div><div className="mt-3 flex flex-wrap gap-2">{mandate.approvedRegions.map((item) => <span key={item} className="rounded-full border border-white/8 px-2.5 py-1 text-xs text-zinc-400">{item}</span>)}</div></div>
              <div className="space-y-2 text-sm text-zinc-400">
                <div className="flex items-center gap-2"><Check className="size-4 text-emerald-300" /> US data residency required</div>
                <div className="flex items-center gap-2"><Pause className="size-4 text-zinc-600" /> Customer data purchases disabled</div>
              </div>
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
