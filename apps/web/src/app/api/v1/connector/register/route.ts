import { NextResponse } from "next/server";

/** Connector handshake — a site exchanges its key for a session */
export async function POST(request: Request) {
  void request;
  return NextResponse.json({ error: "not_implemented" }, { status: 501 });
}
