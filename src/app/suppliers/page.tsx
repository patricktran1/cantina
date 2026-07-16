import { Boxes, Clock, LockKeyhole, MapPin, ShieldCheck } from "lucide-react";
import { SectionHeading } from "@/components/section-heading";
import { listSuppliers } from "@/lib/store";
import { formatMinorUnits, formatPercentBps } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function SuppliersPage() {
  const suppliers = await listSuppliers();
  return (
    <div>
      <SectionHeading eyebrow="Machine-readable marketplace" title="Suppliers" description="Seeded offers expose price, latency, regional availability, reliability, and compliance metadata to the procurement engine." />
      <div className="mt-8 grid gap-5 xl:grid-cols-3">
        {suppliers.map((supplier) => (
          <section key={supplier.id} className="rounded-2xl border border-white/8 bg-[#0d1218] p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="grid size-11 place-items-center rounded-xl bg-white/5"><Boxes className="size-5 text-lime-300" /></div>
              <div className="rounded-full border border-white/8 px-2.5 py-1 text-xs text-zinc-500">{formatPercentBps(supplier.reputationScoreBps)} rep</div>
            </div>
            <h2 className="mt-5 text-lg font-semibold">{supplier.name}</h2>
            <p className="mt-2 min-h-12 text-sm leading-6 text-zinc-500">{supplier.description}</p>
            <div className="mt-5 grid grid-cols-2 gap-3">
              <div className="rounded-lg border border-white/7 bg-white/[0.02] p-3"><div className="text-xs text-zinc-600">Quote</div><div className="mt-1 font-semibold">{formatMinorUnits(supplier.priceMinor)}</div></div>
              <div className="rounded-lg border border-white/7 bg-white/[0.02] p-3"><div className="text-xs text-zinc-600">Reliability</div><div className="mt-1 font-semibold">{formatPercentBps(supplier.reliabilityBps)}</div></div>
            </div>
            <div className="mt-5 space-y-3 text-sm text-zinc-400">
              <div className="flex items-center gap-3"><Clock className="size-4 text-zinc-600" /> {supplier.estimatedDurationSeconds}s estimated</div>
              <div className="flex items-center gap-3"><MapPin className="size-4 text-zinc-600" /> {supplier.regions.join(", ")}</div>
              <div className="flex items-center gap-3"><LockKeyhole className="size-4 text-zinc-600" /> Privacy score {supplier.privacyScore}/100</div>
              <div className="flex items-center gap-3"><ShieldCheck className="size-4 text-zinc-600" /> {supplier.complianceControls.join(", ")}</div>
            </div>
            <div className="mt-5 border-t border-white/8 pt-4 text-xs text-zinc-600">{supplier.completedJobs} completed · {supplier.failedJobs} failed</div>
          </section>
        ))}
      </div>
    </div>
  );
}
