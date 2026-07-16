import { Fingerprint } from "lucide-react";
import { SectionHeading } from "@/components/section-heading";
import { listAuditEvents } from "@/lib/store";
import { formatDateTime } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AuditLogPage() {
  const events = await listAuditEvents();
  return (
    <div>
      <SectionHeading eyebrow="Immutable evidence trail" title="Audit log" description="Append-only events are sequence-numbered and hash-chained so tampering becomes detectable." />
      <div className="mt-8 overflow-hidden rounded-2xl border border-white/8 bg-[#0d1218]">
        <div className="divide-y divide-white/6">
          {events.map((event) => (
            <div key={event.id} className="grid gap-4 px-5 py-4 lg:grid-cols-[72px_210px_1fr_220px] lg:items-center">
              <div className="font-mono text-xs text-zinc-600">#{String(event.sequence).padStart(4, "0")}</div>
              <div>
                <div className="text-sm font-medium text-zinc-300">{event.eventType.replaceAll("_", " ")}</div>
                <div className="mt-1 text-xs text-zinc-600">{formatDateTime(event.createdAt)}</div>
              </div>
              <div className="text-xs leading-5 text-zinc-500">{JSON.stringify(event.payload)}</div>
              <div className="flex min-w-0 items-center gap-2 font-mono text-[10px] text-zinc-700"><Fingerprint className="size-4 shrink-0" /><span className="truncate">{event.eventHash}</span></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
