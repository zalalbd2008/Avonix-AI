import { NextResponse } from "next/server";

/** Stripe subscription lifecycle */
export async function POST(request: Request) {
  void request;
  return NextResponse.json({ error: "not_implemented" }, { status: 501 });
}
