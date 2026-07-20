import { NextResponse } from "next/server";

/** AI chat turn from the widget — rate limited, metered */
export async function POST(request: Request) {
  void request;
  return NextResponse.json({ error: "not_implemented" }, { status: 501 });
}
