import { defineConfig, devices } from "@playwright/test";
const database = process.env.DATABASE_URL;
const externalUrl = process.env.PACKD_E2E_BASE_URL;
const baseURL = externalUrl ?? "http://localhost:3001";
if (!database || new URL(database).pathname !== "/packd_test")
  throw new Error("Browser tests require a dedicated packd_test database.");
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 45000,
  expect: { timeout: 10000 },
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
  ],
  webServer: externalUrl
    ? undefined
    : {
        command: "npm run start -- --port 3001",
        url: "http://localhost:3001",
        reuseExistingServer: false,
        env: {
          DATABASE_URL: database,
          AUTH_SECRET: "packd-test-only-secret-never-use-in-production-123456",
          AUTH_URL: "http://localhost:3001",
          AUTH_TRUST_HOST: "true",
          ANTHROPIC_API_KEY: "",
          TAVILY_API_KEY: "",
        },
        timeout: 120000,
      },
});
