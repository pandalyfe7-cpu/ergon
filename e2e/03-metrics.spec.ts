import { expect, test } from "@playwright/test";

/**
 * Metrics: five cards, 7/30/90 windows, trend + target display, derived
 * protein target with its source weight. Starts by logging a bodyweight via
 * quick-add so the derived target always has data.
 */

test("quick-add bodyweight feeds the dashboard", async ({ page }) => {
  await page.goto("/today");
  await page.keyboard.press("ControlOrMeta+j");
  await expect(page.getByRole("dialog", { name: "Quick add" })).toBeVisible();
  await page.getByRole("button", { name: "Log bodyweight" }).click();

  const dialog = page.getByRole("dialog", { name: "Log bodyweight" });
  await expect(dialog).toBeVisible();
  await dialog.getByLabel("Bodyweight, lb", { exact: false }).fill("160");
  await dialog.getByRole("button", { name: "Log", exact: true }).click();
  await expect(page.getByText("Bodyweight 160 lb logged")).toBeVisible();
});

test("five metric cards render with targets", async ({ page }) => {
  await page.goto("/metrics");
  for (const name of [
    "Bodyweight",
    "Sleep duration",
    "Protein intake",
    "Training days",
    "Morning readiness",
  ]) {
    await expect(page.getByRole("heading", { name })).toBeVisible();
  }
  expect(await page.getByText("target", { exact: false }).count()).toBeGreaterThanOrEqual(5);
});

test("every card shows a trend line or a designed empty state", async ({ page }) => {
  await page.goto("/metrics");
  const cards = page.locator("li:has(h3)");
  await expect(cards).toHaveCount(5);
  for (let i = 0; i < 5; i++) {
    const card = cards.nth(i);
    // Auto-waits for either the sparkline or the designed empty state.
    await expect(
      card.locator("svg").or(card.getByText("Nothing logged in this window yet.")).first(),
    ).toBeVisible();
  }
});

test("window switching between 7, 30, and 90 days", async ({ page }) => {
  await page.goto("/metrics");
  const nav = page.getByRole("navigation", { name: "Window" });

  await nav.getByRole("link", { name: "30d" }).click();
  await page.waitForURL("**/metrics?w=30");
  await expect(nav.getByRole("link", { name: "30d" })).toHaveAttribute("aria-current", "page");
  await expect(page.getByText(/\/30 days logged/).first()).toBeVisible();

  await nav.getByRole("link", { name: "90d" }).click();
  await page.waitForURL("**/metrics?w=90");
  await expect(page.getByText(/\/90 days logged/).first()).toBeVisible();

  await nav.getByRole("link", { name: "7d" }).click();
  await page.waitForURL("**/metrics");
  await expect(nav.getByRole("link", { name: "7d" })).toHaveAttribute("aria-current", "page");
});

test("derived protein target names its source weight", async ({ page }) => {
  await page.goto("/metrics");
  await expect(page.getByText(/derived from .* lb 7-day avg/)).toBeVisible();
});
