import { NextResponse } from "next/server";

export function GET() {
  return NextResponse.json({
    status: "ok",
    service: "cantina",
    persistence: process.env.DATABASE_URL ? "postgresql" : "memory",
    timestamp: new Date().toISOString(),
  });
}
