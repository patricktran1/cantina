import { SectionHeading } from "@/components/section-heading";
import { StatusPill } from "@/components/status-pill";
import { listTransactions } from "@/lib/store";
import { formatDateTime, formatMinorUnits } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function TransactionsPage() {
  const transactions = await listTransactions();
  return (
    <div>
      <SectionHeading eyebrow="Internal ledger" title="Transactions" description="Every financial operation is idempotent and represented by balanced debit and credit entries in integer minor units." />
      <div className="mt-8 space-y-4">
        {transactions.map((transaction) => {
          const amount = transaction.entries.filter((entry) => entry.direction === "DEBIT").reduce((sum, entry) => sum + entry.amountMinor, 0);
          return (
            <section key={transaction.id} className="rounded-2xl border border-white/8 bg-[#0d1218]">
              <div className="flex flex-col gap-3 border-b border-white/8 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex items-center gap-3"><StatusPill status={transaction.type} /><span className="text-sm text-zinc-300">{transaction.description}</span></div>
                  <div className="mt-2 text-xs text-zinc-600">{formatDateTime(transaction.createdAt)} · {transaction.idempotencyKey}</div>
                </div>
                <div className="text-lg font-semibold tabular-nums">{formatMinorUnits(amount)}</div>
              </div>
              <div className="divide-y divide-white/6">
                {transaction.entries.map((entry) => (
                  <div key={entry.id} className="grid gap-2 px-5 py-3 text-sm sm:grid-cols-[100px_1fr_auto]">
                    <span className={entry.direction === "DEBIT" ? "text-cyan-300" : "text-violet-300"}>{entry.direction}</span>
                    <span className="font-mono text-xs text-zinc-500">{entry.accountCode}</span>
                    <span className="tabular-nums text-zinc-300">{formatMinorUnits(entry.amountMinor)}</span>
                  </div>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
