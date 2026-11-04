import { spawnSync } from "node:child_process";
const database = process.env.DATABASE_URL;
if (!database || new URL(database).pathname !== "/packd_test") {
  throw new Error(
    "Use a dedicated database named packd_test. Integration tests never run against the app database.",
  );
}
const result = spawnSync(
  process.execPath,
  ["node_modules/vitest/vitest.mjs", "run"],
  { stdio: "inherit", env: process.env },
);
process.exit(result.status ?? 1);
