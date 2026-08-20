import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";

// POST /api/spots/:id/favorite — toggle favorite status for the signed-in
// user. Create-or-delete on the (userId, spotId) unique pair, so this is
// idempotent-ish by design: calling it twice just toggles back off.
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Sign in to save favorites." }, { status: 401 });
  }
  const userId = (session.user as typeof session.user & { id: string }).id;

  const existing = await db.favorite.findUnique({
    where: { userId_spotId: { userId, spotId: params.id } },
  });

  if (existing) {
    await db.favorite.delete({ where: { id: existing.id } });
    return NextResponse.json({ favorited: false });
  }

  await db.favorite.create({ data: { userId, spotId: params.id } });
  return NextResponse.json({ favorited: true });
}
