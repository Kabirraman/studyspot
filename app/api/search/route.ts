import { NextRequest, NextResponse } from "next/server";
import { searchSpots } from "@/lib/agent";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const query = body?.query;

  if (typeof query !== "string" || query.trim().length === 0) {
    return NextResponse.json(
      { error: "Request body must include a non-empty 'query' string." },
      { status: 400 }
    );
  }

  try {
    const result = await searchSpots(query.trim());
    return NextResponse.json(result);
  } catch (err) {
    console.error("searchSpots failed:", err);
    return NextResponse.json(
      { error: "Search failed. Please try again." },
      { status: 500 }
    );
  }
}
