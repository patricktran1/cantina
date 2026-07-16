"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight, LoaderCircle, ShieldCheck } from "lucide-react";

const fieldClass = "mt-2 w-full rounded-lg border border-white/10 bg-[#090d12] px-3.5 py-3 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-700 focus:border-lime-300/40 focus:ring-2 focus:ring-lime-300/10";
const labelClass = "text-xs font-medium uppercase tracking-[0.14em] text-zinc-500";

export function PurchaseRequestForm() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(formData: FormData) {
    setSubmitting(true);
    setError(null);
    const payload = {
      taskDescription: String(formData.get("taskDescription")),
      maximumBudgetMinor: Math.round(Number(formData.get("maximumBudgetDollars")) * 100),
      deadlineSeconds: Number(formData.get("deadlineSeconds")),
      category: String(formData.get("category")),
      allowedRegions: formData.getAll("allowedRegions").map(String),
      minimumReliabilityBps: Math.round(Number(formData.get("minimumReliabilityPercent")) * 100),
      customerDataIncluded: formData.get("customerDataIncluded") === "on",
      requireUsDataResidency: formData.get("requireUsDataResidency") === "on",
      requireStrongPrivacyControls: formData.get("requireStrongPrivacyControls") === "on",
      humanApprovalThresholdMinor: Math.round(Number(formData.get("humanApprovalThresholdDollars")) * 100),
      idempotencyKey: crypto.randomUUID(),
    };

    try {
      const response = await fetch("/api/purchase-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Unable to create purchase request.");
      router.push(`/purchase-requests/${body.purchase.id}`);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unknown error");
      setSubmitting(false);
    }
  }

  return (
    <form action={submit} className="mt-8 grid gap-6 lg:grid-cols-[1.4fr_0.8fr]">
      <section className="rounded-2xl border border-white/8 bg-[#0d1218] p-6">
        <h2 className="text-base font-semibold">Workload</h2>
        <div className="mt-6">
          <label className={labelClass} htmlFor="taskDescription">Task description</label>
          <textarea
            id="taskDescription"
            name="taskDescription"
            rows={7}
            className={fieldClass}
            defaultValue="Generate 100 product descriptions for less than $0.30, complete the task within three minutes, and do not send data outside the United States."
            required
          />
        </div>
        <div className="mt-5 grid gap-5 sm:grid-cols-3">
          <label className={labelClass}>Maximum budget
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-zinc-600">$</span>
              <input name="maximumBudgetDollars" type="number" min="0.01" step="0.01" defaultValue="0.30" className={`${fieldClass} pl-7`} required />
            </div>
          </label>
          <label className={labelClass}>Deadline
            <select name="deadlineSeconds" defaultValue="180" className={fieldClass}>
              <option value="60">1 minute</option>
              <option value="180">3 minutes</option>
              <option value="300">5 minutes</option>
              <option value="900">15 minutes</option>
            </select>
          </label>
          <label className={labelClass}>Resource category
            <select name="category" defaultValue="INFERENCE" className={fieldClass}>
              <option value="INFERENCE">Inference</option>
              <option value="COMPUTE">Compute</option>
            </select>
          </label>
        </div>
      </section>

      <section className="rounded-2xl border border-white/8 bg-[#0d1218] p-6">
        <div className="flex items-center gap-2">
          <ShieldCheck className="size-4 text-lime-300" />
          <h2 className="text-base font-semibold">Guardrails</h2>
        </div>
        <div className="mt-6">
          <div className={labelClass}>Allowed regions</div>
          <div className="mt-3 flex flex-wrap gap-3">
            {[
              ["us-west", "US West"],
              ["us-central", "US Central"],
              ["eu-west", "EU West"],
            ].map(([value, label]) => (
              <label key={value} className="flex items-center gap-2 rounded-lg border border-white/8 bg-white/[0.025] px-3 py-2 text-sm text-zinc-300">
                <input type="checkbox" name="allowedRegions" value={value} defaultChecked={value !== "eu-west"} className="accent-lime-300" />
                {label}
              </label>
            ))}
          </div>
        </div>
        <label className={`${labelClass} mt-5 block`}>Minimum reliability
          <div className="relative">
            <input name="minimumReliabilityPercent" type="number" min="0" max="100" step="0.01" defaultValue="99.00" className={fieldClass} required />
            <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-sm text-zinc-600">%</span>
          </div>
        </label>
        <label className={`${labelClass} mt-5 block`}>Human approval above
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-zinc-600">$</span>
            <input name="humanApprovalThresholdDollars" type="number" min="0" step="0.01" defaultValue="25.00" className={`${fieldClass} pl-7`} required />
          </div>
        </label>
        <div className="mt-6 space-y-3 text-sm text-zinc-300">
          <label className="flex items-start gap-3">
            <input type="checkbox" name="requireUsDataResidency" defaultChecked className="mt-1 accent-lime-300" />
            Require US data residency
          </label>
          <label className="flex items-start gap-3">
            <input type="checkbox" name="requireStrongPrivacyControls" className="mt-1 accent-lime-300" />
            Require strongest privacy controls
          </label>
          <label className="flex items-start gap-3">
            <input type="checkbox" name="customerDataIncluded" className="mt-1 accent-lime-300" />
            Workload contains customer data
          </label>
        </div>
      </section>

      <div className="lg:col-span-2">
        {error ? <div className="mb-4 rounded-lg border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-200">{error}</div> : null}
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex items-center gap-2 rounded-lg bg-lime-300 px-5 py-3 text-sm font-semibold text-black transition hover:bg-lime-200 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? <LoaderCircle className="size-4 animate-spin" /> : <ArrowRight className="size-4" />}
          {submitting ? "Running procurement workflow" : "Create and execute request"}
        </button>
        <p className="mt-3 text-xs text-zinc-600">The V1 job runner executes synchronously so every state is visible immediately.</p>
      </div>
    </form>
  );
}
