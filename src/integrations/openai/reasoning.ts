import OpenAI from "openai";

export interface ProcurementNarrativeInput {
  taskDescription: string;
  selectedSupplier: string;
  deterministicRationale: string;
}

export async function createProcurementNarrative(input: ProcurementNarrativeInput): Promise<string> {
  if (!process.env.OPENAI_API_KEY) return input.deterministicRationale;
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const response = await client.responses.create({
    model: process.env.OPENAI_REASONING_MODEL ?? "gpt-5-mini",
    input: [
      {
        role: "system",
        content: "Explain the deterministic procurement decision in concise enterprise language. Do not alter eligibility, price, authorization, or settlement decisions.",
      },
      {
        role: "user",
        content: JSON.stringify(input),
      },
    ],
  });
  return response.output_text || input.deterministicRationale;
}
