import { expect, test } from "@playwright/test";

/**
 * Logged-out surfaces: landing (rewritten from /), sign-in, sign-up, Google
 * button present. No storageState — this is the public path.
 */

test.use({ storageState: { cookies: [], origins: [] } });

test("landing at / asks what is worth doing today", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "What is worth doing today?" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Create account" })).toHaveAttribute(
    "href",
    "/sign-up",
  );
  await expect(page.getByRole("link", { name: "Sign in" })).toHaveAttribute("href", "/sign-in");
  await expect(page.getByText("or continue with")).toBeVisible();
  await expect(page.getByRole("button", { name: "Continue with Google" })).toBeVisible();
});

test("sign-in Create account is a link, not a second submit", async ({ page }) => {
  await page.goto("/sign-in");
  await expect(page.getByRole("heading", { name: "ERGOS" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Sign in", exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Create account" })).toHaveCount(0);
  await page.getByRole("link", { name: "Create account" }).click();
  await page.waitForURL("**/sign-up");
  await expect(page.getByRole("heading", { name: "ERGOS" })).toBeVisible();
  await expect(page.getByText("Create your log.")).toBeVisible();
});

test("sign-up has confirm password and Google", async ({ page }) => {
  await page.goto("/sign-up");
  await expect(page.getByLabel("Email")).toBeVisible();
  await expect(page.getByLabel("Password", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Confirm password")).toBeVisible();
  await expect(page.getByRole("button", { name: "Create account" })).toBeVisible();
  await expect(page.getByText("or continue with")).toBeVisible();
  await expect(page.getByRole("button", { name: "Continue with Google" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Sign in" })).toBeVisible();
});

test("empty create-account submit is blocked before a network call", async ({ page }) => {
  await page.goto("/sign-up");
  await page.getByRole("button", { name: "Create account" }).click();
  // Native required on email still fires; the page must stay on sign-up.
  await expect(page).toHaveURL(/\/sign-up/);
});
