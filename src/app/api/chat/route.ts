import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const endpoint = process.env.NEXT_PUBLIC_AEVIBRON_ENDPOINT || "https://api.aevibron.com/api/v1/chat";
    const key = process.env.AEVIBRON_API_KEY || "";

    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Aevibron-Key": key,
      },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
