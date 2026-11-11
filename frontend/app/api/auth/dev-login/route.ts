import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { db } from "@/lib/server/db";

export async function POST(request: Request) {
  if (
    process.env.NODE_ENV !== "development" ||
    process.env.ALLOW_DEV_LOGIN !== "true"
  )
    return new Response("Development login is disabled", { status: 403 });
  const url = new URL(request.url);
  if (
    !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) ||
    request.headers.get("origin") !== url.origin
  )
    return new Response(
      "Development login requires the local application origin",
      { status: 403 },
    );

  // A dedicated local account must never impersonate a real person's account.
  const user = await db.user.upsert({
    where: { email: "packd-local-demo@example.invalid" },
    create: { email: "packd-local-demo@example.invalid", name: "Local Demo" },
    update: {},
  });
  const token = randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + 60 * 60 * 1000);
  await db.session.create({
    data: { sessionToken: token, userId: user.id, expires },
  });
  const cookieStore = await cookies();
  cookieStore.set("authjs.session-token", token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    expires,
  });
  return NextResponse.redirect(new URL("/trips", request.url), 303);
}
