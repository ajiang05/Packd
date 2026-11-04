export const dynamic = "force-dynamic";
export function GET() {
  return Response.json(
    { revision: process.env.RELEASE_VERSION ?? "development" },
    { headers: { "Cache-Control": "no-store" } },
  );
}
