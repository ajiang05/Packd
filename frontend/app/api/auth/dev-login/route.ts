import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { db } from "@/lib/server/db";

export async function GET(request: Request) {
  if (
    process.env.NODE_ENV === "production" &&
    process.env.ALLOW_DEV_LOGIN !== "true"
  ) {
    return new Response("Dev login disabled in production", { status: 403 });
  }

  // Find Aidan or the first user
  const user =
    (await db.user.findFirst({
      where: { email: "aidanjiang3@gmail.com" },
    })) ?? (await db.user.findFirstOrThrow());

  const token = randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

  await db.session.create({
    data: {
      sessionToken: token,
      userId: user.id,
      expires,
    },
  });

  const cookieStore = await cookies();
  cookieStore.set("authjs.session-token", token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    expires,
  });

  const url = new URL("/trips", request.url);
  return NextResponse.redirect(url);
}
