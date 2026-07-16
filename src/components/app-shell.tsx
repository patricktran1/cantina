import Link from "next/link";
import {
  Activity,
  BookOpenCheck,
  Boxes,
  FileClock,
  Gauge,
  Landmark,
  ListPlus,
  ScrollText,
} from "lucide-react";

const navigation = [
  { href: "/", label: "Dashboard", icon: Gauge },
  { href: "/purchase-requests/new", label: "New request", icon: ListPlus },
  { href: "/transactions", label: "Transactions", icon: Landmark },
  { href: "/suppliers", label: "Suppliers", icon: Boxes },
  { href: "/mandates", label: "Mandates", icon: BookOpenCheck },
  { href: "/audit-log", label: "Audit log", icon: ScrollText },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#080b0f] text-zinc-100">
      <div className="mx-auto flex min-h-screen max-w-[1680px]">
        <aside className="hidden w-64 shrink-0 border-r border-white/8 bg-[#0b0f14] px-5 py-6 lg:block">
          <Link href="/" className="flex items-center gap-3 px-2">
            <div className="grid size-10 place-items-center rounded-xl border border-lime-300/25 bg-lime-300/10">
              <Activity className="size-5 text-lime-300" />
            </div>
            <div>
              <div className="text-lg font-semibold tracking-tight">Cantina</div>
              <div className="text-[10px] uppercase tracking-[0.22em] text-zinc-500">Agent commerce rail</div>
            </div>
          </Link>
          <nav className="mt-9 space-y-1.5">
            {navigation.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-zinc-400 transition hover:bg-white/5 hover:text-white"
              >
                <Icon className="size-4" />
                {label}
              </Link>
            ))}
          </nav>
          <div className="mt-10 rounded-xl border border-white/8 bg-white/[0.025] p-4">
            <div className="flex items-center gap-2 text-xs font-medium text-zinc-300">
              <FileClock className="size-4 text-lime-300" />
              Local V1 kernel
            </div>
            <p className="mt-2 text-xs leading-5 text-zinc-500">
              Simulated suppliers, credits, execution, verification, and settlement.
            </p>
          </div>
        </aside>
        <div className="min-w-0 flex-1">
          <header className="flex h-16 items-center justify-between border-b border-white/8 px-5 lg:px-8">
            <div className="lg:hidden">
              <Link href="/" className="font-semibold">Cantina</Link>
            </div>
            <div className="hidden text-xs uppercase tracking-[0.18em] text-zinc-500 lg:block">
              Procurement · Clearing · Settlement
            </div>
            <div className="flex items-center gap-3">
              <span className="rounded-full border border-emerald-400/20 bg-emerald-400/8 px-3 py-1 text-xs text-emerald-300">
                Demo network online
              </span>
              <div className="grid size-8 place-items-center rounded-full bg-zinc-800 text-xs font-semibold">PT</div>
            </div>
          </header>
          <main className="p-5 lg:p-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
