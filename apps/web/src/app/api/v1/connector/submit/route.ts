import { NextResponse } from "next/server";

/** Form submission from a connected site */
export async function POST(request: Request) {
  void request;
  return NextResponse.json({ error: "not_implemented" }, { status: 501 });
}
