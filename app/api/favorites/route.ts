import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// GET /api/favorites — the signed-in user's favorited spot ids. Returns an
// empty array (not a 401) when signed out, so the frontend doesn't need to
// special-case guests — everything just shows as "not favorited".
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json([]);

  const favorites = await db.favorite.findMany({
    where: { userId: (session.user as typeof session.user & { id: string }).id },
    select: { spotId: true },
  });

  return NextResponse.json(favorites.map((f) => f.spotId));
}
