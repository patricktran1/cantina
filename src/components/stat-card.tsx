import type { LucideIcon } from "lucide-react";

export function StatCard({
  label,
  value,
  note,
  icon: Icon,
}: {
  label: string;
  value: string;
  note: string;
  icon: LucideIcon;
}) {
  return (
    <div className="rounded-2xl border border-white/8 bg-[#0d1218] p-5 shadow-[0_18px_60px_rgba(0,0,0,0.18)]">
      <div className="flex items-start justify-between">
        <span className="text-sm text-zinc-500">{label}</span>
        <div className="grid size-9 place-items-center rounded-lg bg-white/5 text-zinc-400">
          <Icon className="size-4" />
        </div>
      </div>
      <div className="mt-5 text-2xl font-semibold tracking-tight text-white">{value}</div>
      <div className="mt-1 text-xs text-zinc-500">{note}</div>
    </div>
  );
}
