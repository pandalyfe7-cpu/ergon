import { expect, test } from "@playwright/test";

/**
 * Command palette: Ctrl+K navigation to every screen, quick-add via Ctrl+J,
 * keyboard-only operation end to end.
 */

const SCREENS: [string, string][] = [
  ["Guidance", "/guidance"],
  ["Metrics", "/metrics"],
  ["Habits", "/habits"],
  ["History", "/history"],
  ["Food", "/log-food"],
  ["Settings", "/settings"],
  ["Today", "/"],
];

test("Ctrl+K navigates to every screen by keyboard alone", async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto("/");
  for (const [label, path] of SCREENS) {
    await page.keyboard.press("ControlOrMeta+k");
    const palette = page.getByRole("dialog", { name: "Command palette" });
    await expect(palette).toBeVisible();
    await palette.getByLabel("Command").fill(label);
    await page.keyboard.press("Enter");
    await page.waitForURL(path === "/" ? new RegExp("/$") : new RegExp(path));
  }
});

test("palette filters and closes on Escape", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("ControlOrMeta+k");
  const palette = page.getByRole("dialog", { name: "Command palette" });
  await palette.getByLabel("Command").fill("zzz-no-match");
  await expect(palette.getByText("No command matches", { exact: false })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(palette).not.toBeVisible();
});

test("Ctrl+J quick-add offers bodyweight, food, and habit marks", async ({ page }) => {
  await page.goto("/");
  await page.keyboard.press("ControlOrMeta+j");
  const quickAdd = page.getByRole("dialog", { name: "Quick add" });
  await expect(quickAdd).toBeVisible();

  await expect(quickAdd.getByRole("button", { name: "Log bodyweight" })).toBeVisible();
  await expect(quickAdd.getByRole("button", { name: "Log food" })).toBeVisible();
  await expect(
    quickAdd.getByRole("button", { name: "Mark done: Study blocks" }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
});

test("quick-add bodyweight logs without leaving the screen", async ({ page }) => {
  await page.goto("/habits");
  await page.keyboard.press("ControlOrMeta+j");
  await page.getByRole("button", { name: "Log bodyweight" }).click();

  const dialog = page.getByRole("dialog", { name: "Log bodyweight" });
  await dialog.getByLabel("Bodyweight, lb", { exact: false }).fill("161");
  await dialog.getByRole("button", { name: "Log", exact: true }).click();

  await expect(page.getByText("Bodyweight 161 lb logged")).toBeVisible();
  // Still on Habits; the quick-add never navigated.
  await expect(page.getByRole("heading", { name: "Habits" })).toBeVisible();
});
