import { expect, test } from "@playwright/test";

/**
 * Console sweep: every screen renders with zero console errors or warnings
 * and zero uncaught page errors.
 */

const SCREENS = [
  "/today",
  "/guidance",
  "/metrics",
  "/metrics?w=30",
  "/habits",
  "/history",
  "/log-food",
  "/log-food/new",
  "/log-food/describe",
  "/log-food/recipes",
  "/settings",
];

test("zero console errors or warnings on any screen", async ({ page }) => {
  test.setTimeout(120_000);
  const problems: string[] = [];

  page.on("console", (message) => {
    if (message.type() === "error" || message.type() === "warning") {
      problems.push(`[${message.type()}] ${page.url()}: ${message.text()}`);
    }
  });
  page.on("pageerror", (error) => {
    problems.push(`[pageerror] ${page.url()}: ${error.message}`);
  });

  for (const path of SCREENS) {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
  }

  // A history detail page too, when one exists.
  await page.goto("/history");
  const row = page.getByRole("link", { name: /lb volume/ }).first();
  if (await row.isVisible().catch(() => false)) {
    await row.click();
    await page.waitForLoadState("networkidle");
  }

  expect(problems, problems.join("\n")).toEqual([]);
});
