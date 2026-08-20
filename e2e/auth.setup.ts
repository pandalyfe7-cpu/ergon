import { execSync } from "node:child_process";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

import { expect, test as setup } from "@playwright/test";

import { ensureAuthUser } from "./db";
import { E2E_EMAIL, E2E_PASSWORD } from "./env";

const AUTH_FILE = join(__dirname, ".auth", "user.json");

setup("provision, seed, and sign in the E2E user", async ({ page }) => {
  setup.setTimeout(120_000);

  const userId = await ensureAuthUser(E2E_EMAIL, E2E_PASSWORD);

  execSync(`node scripts/seed.mjs --user=${userId}`, {
    cwd: join(__dirname, ".."),
    stdio: "inherit",
  });

  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(E2E_EMAIL);
  await page.getByLabel("Password").fill(E2E_PASSWORD);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await page.waitForURL("/");
  await expect(page.getByRole("heading", { name: "Today" })).toBeVisible();

  mkdirSync(join(__dirname, ".auth"), { recursive: true });
  await page.context().storageState({ path: AUTH_FILE });
});
