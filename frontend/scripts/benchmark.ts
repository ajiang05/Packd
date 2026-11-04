import { randomBytes } from "node:crypto";
import { performance } from "node:perf_hooks";
import { writeFile } from "node:fs/promises";
import { db } from "../lib/server/db";

async function main() {
  const database = new URL(process.env.DATABASE_URL ?? "");
  if (database.pathname !== "/packd_test")
    throw new Error("Benchmark requires the isolated packd_test database.");
  const base = new URL(process.env.BENCHMARK_URL ?? "http://localhost:3003");
  if (!["localhost", "127.0.0.1"].includes(base.hostname))
    throw new Error("This fixture benchmark is local-only.");
  const user = await db.user.create({ data: { name: "Benchmark fixture" } });
  let tripId: string | undefined;
  try {
    const token = randomBytes(32).toString("hex");
    await db.session.create({
      data: {
        userId: user.id,
        sessionToken: token,
        expires: new Date(Date.now() + 3600000),
      },
    });
    const trip = await db.trip.create({
      data: {
        name: "Benchmark fixture",
        destination: "San Juan",
        startDate: new Date("2026-12-20"),
        endDate: new Date("2026-12-25"),
        timezone: "America/Puerto_Rico",
        createdById: user.id,
        members: { create: { userId: user.id, addedById: user.id } },
        activities: {
          create: Array.from({ length: 20 }, (_, i) => ({
            name: `Activity ${i + 1}`,
            proposedById: user.id,
          })),
        },
      },
    });
    tripId = trip.id;
    const request = async () => {
      const start = performance.now();
      const response = await fetch(
        new URL(`/api/trips/${trip.id}/activities`, base),
        {
          headers: { Cookie: `authjs.session-token=${token}` },
          signal: AbortSignal.timeout(15000),
        },
      );
      const body = await response.json();
      return {
        ms: performance.now() - start,
        ok: response.status === 200 && body.items?.length === 20,
      };
    };
    for (let i = 0; i < 10; i++) {
      const result = await request();
      if (!result.ok)
        throw new Error(
          "Warmup did not return the expected authorized activity page.",
        );
    }
    const results: { ms: number; ok: boolean }[] = [];
    const start = performance.now();
    await Promise.all(
      Array.from({ length: 10 }, async () => {
        for (let i = 0; i < 20; i++) results.push(await request());
      }),
    );
    const durationMs = performance.now() - start;
    const latencies = results.map((r) => r.ms).sort((a, b) => a - b);
    const percentile = (p: number) =>
      Math.round(latencies[Math.ceil(latencies.length * p) - 1] * 100) / 100;
    const report = {
      recordedAt: new Date().toISOString(),
      environment:
        "Local Docker production Next.js image, PostgreSQL 17, same workstation; not internet latency or a production capacity claim",
      workload:
        "Authenticated GET activities: one trip, one member, 20 proposals, 10 warmups, 200 measured reads",
      concurrency: 10,
      requests: results.length,
      errors: results.filter((r) => !r.ok).length,
      durationMs: Math.round(durationMs),
      p50Ms: percentile(0.5),
      p95Ms: percentile(0.95),
      p99Ms: percentile(0.99),
    };
    await writeFile(
      "../docs/verification/local-benchmark.json",
      JSON.stringify(report, null, 2) + "\n",
    );
    console.log(JSON.stringify(report, null, 2));
    if (report.errors) process.exitCode = 1;
  } finally {
    if (tripId) await db.trip.delete({ where: { id: tripId } });
    await db.user.delete({ where: { id: user.id } });
    await db.$disconnect();
  }
}
main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
