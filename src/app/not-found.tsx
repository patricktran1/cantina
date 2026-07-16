import Link from "next/link";

export default function NotFound() {
  return (
    <div className="grid min-h-[60vh] place-items-center text-center">
      <div><div className="text-xs uppercase tracking-[0.2em] text-lime-300">404</div><h1 className="mt-3 text-3xl font-semibold">Transaction not found</h1><p className="mt-3 text-sm text-zinc-500">This purchase request does not exist in the current local process.</p><Link href="/" className="mt-6 inline-flex rounded-lg bg-lime-300 px-4 py-2 text-sm font-semibold text-black">Return to dashboard</Link></div>
    </div>
  );
}
