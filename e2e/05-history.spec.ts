import { expect, test } from "@playwright/test";

/**
 * History: finished sessions listed, sets editable in place (edit, add,
 * delete). Depends on 01-today having finished at least one session.
 */

test("finished sessions list with volume and preview", async ({ page }) => {
  await page.goto("/history");
  await expect(page.getByRole("heading", { name: "History" })).toBeVisible();
  const row = page.getByRole("link", { name: /lb volume/ }).first();
  await expect(row).toBeVisible();
});

test("a session's sets can be edited, added, and deleted", async ({ page }) => {
  await page.goto("/history");
  await page.getByRole("link", { name: /lb volume/ }).first().click();
  await page.waitForURL(/\/history\/.+/);

  const firstBlock = page.locator("li:has(h3)").first();

  // Edit: change the first set's weight and confirm it persists.
  const weight = firstBlock.getByLabel(/set weight/).first();
  await expect(weight).toBeVisible();
  await weight.fill("47.5");
  await weight.blur();
  await page.waitForTimeout(1200);
  await page.reload();
  await expect(page.locator("li:has(h3)").first().getByLabel(/set weight/).first()).toHaveValue(
    "47.5",
  );

  // Add: a new row appears at the end of the block.
  const rowsBefore = await firstBlock.getByLabel(/set weight/).count();
  await firstBlock.getByRole("button", { name: "Add set" }).click();
  await expect(firstBlock.getByLabel(/set weight/)).toHaveCount(rowsBefore + 1);

  // Delete: the last row goes away with a confirmation toast.
  await firstBlock.getByRole("button", { name: /^Delete set/ }).last().click();
  await expect(page.getByText("Set deleted")).toBeVisible();
  await expect(firstBlock.getByLabel(/set weight/)).toHaveCount(rowsBefore);
});
