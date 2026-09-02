import { expect, test } from "@playwright/test";

import {
  clearTodayLogs,
  ensureTodayPlan,
  setOnboardingStep,
  testUserId,
} from "./db";

let userId: string;

test.describe("today habit and metric logging", () => {
  test.beforeAll(async () => {
    userId = await testUserId();
  });

  test.beforeEach(async () => {
    await setOnboardingStep(userId, 4);
    await ensureTodayPlan(userId);
    await clearTodayLogs(userId);
  });

  test("logs highlighted habit and metric with trace affordances", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Today" })).toBeVisible();

    const firstHabit = page.getByTestId("today-item-study-blocks");
    await expect(firstHabit.locator(".border-accent")).toBeVisible();
    await firstHabit.getByRole("button", { name: "Log Study blocks" }).click();
    await expect(firstHabit.getByText("Logged")).toBeVisible();

    await firstHabit.getByRole("button", { name: "Trace" }).click();
    await expect(firstHabit.locator("pre")).toContainText("today_habit_log@");
    await expect(firstHabit.locator("pre")).toContainText("habit_events");

    const protein = page.getByTestId("today-item-protein");
    await expect(protein.locator(".border-accent")).toBeVisible();
    await protein.getByLabel("Protein intake value").fill("165");
    await protein.getByRole("button", { name: "Save" }).click();
    await expect(protein.getByText("Logged")).toBeVisible();

    await protein.getByRole("button", { name: "Trace" }).click();
    await expect(protein.locator("pre")).toContainText("today_metric_log@");
    await expect(protein.locator("pre")).toContainText("metric_logs");
  });
});
