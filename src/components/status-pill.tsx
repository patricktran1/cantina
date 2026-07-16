const styles: Record<string, string> = {
  SETTLED: "border-emerald-400/20 bg-emerald-400/10 text-emerald-300",
  DELIVERED: "border-emerald-400/20 bg-emerald-400/10 text-emerald-300",
  VERIFIED: "border-emerald-400/20 bg-emerald-400/10 text-emerald-300",
  COMPLIANT: "border-emerald-400/20 bg-emerald-400/10 text-emerald-300",
  ACTIVE: "border-lime-300/20 bg-lime-300/10 text-lime-200",
  APPROVED: "border-lime-300/20 bg-lime-300/10 text-lime-200",
  CAPTURED: "border-cyan-300/20 bg-cyan-300/10 text-cyan-200",
  HELD: "border-amber-300/20 bg-amber-300/10 text-amber-200",
  AWAITING_APPROVAL: "border-amber-300/20 bg-amber-300/10 text-amber-200",
  AWAITING_HUMAN: "border-amber-300/20 bg-amber-300/10 text-amber-200",
  FAILED: "border-rose-400/20 bg-rose-400/10 text-rose-300",
  REJECTED: "border-rose-400/20 bg-rose-400/10 text-rose-300",
  NON_COMPLIANT: "border-rose-400/20 bg-rose-400/10 text-rose-300",
  DISPUTED: "border-violet-400/20 bg-violet-400/10 text-violet-300",
};

export function StatusPill({ status }: { status: string }) {
  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-medium ${styles[status] ?? "border-white/10 bg-white/5 text-zinc-300"}`}>
      {status.replaceAll("_", " ")}
    </span>
  );
}
