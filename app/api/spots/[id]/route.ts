import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const spot = await db.spot.findUnique({
    where: { id: params.id },
    include: {
      building: true,
      ratings: { orderBy: { createdAt: "desc" } },
      photos: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!spot) {
    return NextResponse.json({ error: "Spot not found." }, { status: 404 });
  }

  return NextResponse.json(spot);
}
