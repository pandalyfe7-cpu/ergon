import { defineConfig, devices } from "@playwright/test";

/**
 * E2E suite (build prompt, Phase QA). Runs against a local production server
 * (`next build` first, then `next start`). One worker: the suite shares a
 * single seeded test user, so specs run in filename order without races.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  retries: 0,
  timeout: 45_000,
  expect: { timeout: 10_000 },
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:3211",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "npx next start -p 3211",
    url: "http://localhost:3211/sign-in",
    reuseExistingServer: true,
    timeout: 60_000,
  },
  projects: [
    {
      name: "setup",
      testMatch: /auth\.setup\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "mobile",
      testIgnore: /auth\.setup\.ts/,
      dependencies: ["setup"],
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 390, height: 844 },
        storageState: "e2e/.auth/user.json",
      },
    },
    {
      name: "desktop",
      testIgnore: /auth\.setup\.ts/,
      dependencies: ["setup"],
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 900 },
        storageState: "e2e/.auth/user.json",
      },
    },
  ],
});
