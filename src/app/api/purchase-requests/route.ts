import { NextResponse } from "next/server";
import { purchaseRequestSchema } from "@/domain/procurement/schemas";
import { createAndRunPurchase } from "@/lib/store";

export async function POST(request: Request) {
  try {
    const payload = purchaseRequestSchema.parse(await request.json());
    const purchase = await createAndRunPurchase(payload);
    return NextResponse.json({ purchase }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid purchase request.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
