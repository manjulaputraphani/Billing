import { test, expect, type Page } from "@playwright/test";
import { neon } from "@neondatabase/serverless";

/**
 * Real end-to-end: browser UI → Neon.
 *
 * Needs DATABASE_URL_TEST pointing at a SEPARATE dev database (it truncates).
 * Skipped otherwise, because the app must talk to a real database here — a
 * mocked one would only prove the mock.
 */
const TEST_URL = process.env.DATABASE_URL_TEST?.trim();

function keychainStub(url: string) {
  localStorage.setItem("__kc_store__", JSON.stringify({}));
  (window as unknown as { __TAURI_INTERNALS__: unknown }).__TAURI_INTERNALS__ = {
    transformCallback: () => 1,
    unregisterCallback: () => {},
    convertFileSrc: (p: string) => p,
    invoke: async (cmd: string, args: Record<string, string> = {}) => {
      const KEY = "__kc_store__";
      const store = JSON.parse(localStorage.getItem(KEY) || "{}") as Record<string, string>;
      if (cmd === "save_secret") {
        store[args.key] = args.key === "DATABASE_URL" ? url : args.value;
        localStorage.setItem(KEY, JSON.stringify(store));
        return null;
      }
      if (cmd === "get_secret") return store[args.key] ?? null;
      if (cmd === "delete_secret") {
        delete store[args.key];
        localStorage.setItem(KEY, JSON.stringify(store));
        return null;
      }
      if (cmd === "hash_pin") return `hash:${args.pin}`;
      if (cmd === "verify_pin") return args.hash === `hash:${args.pin}`;
      throw new Error(`unknown command: ${cmd}`);
    },
  };
}

async function openAndUnlock(page: Page) {
  await page.addInitScript(keychainStub, TEST_URL!);
  await page.goto("/");
  await page.getByLabel("Neon connection string").fill(TEST_URL!);
  await page.getByLabel("PIN", { exact: true }).fill("1234");
  await page.getByLabel("Confirm PIN").fill("1234");
  await page.getByRole("button", { name: "Save & continue" }).click();
  await page.getByLabel("PIN", { exact: true }).fill("1234");
  await page.getByRole("button", { name: "Unlock" }).click();
}

test.describe("main flow (real database)", () => {
  test.skip(!TEST_URL, "Needs DATABASE_URL_TEST pointing at a separate dev database");

  test.beforeAll(async () => {
    const sql = neon(TEST_URL!);
    await sql`truncate movement_batch_links, stock_movements, batches, purchases,
              expenses, ai_suggestions, settings, suppliers, items
              restart identity cascade`;
  });

  test("add an item, add an expense, see the dashboard total", async ({ page }) => {
    await openAndUnlock(page);
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();

    // New user → empty state.
    await expect(page.getByRole("link", { name: "Add your first item" })).toBeVisible();

    // Item.
    await page.getByRole("link", { name: "Items", exact: true }).click();
    await page.getByRole("button", { name: "Add item" }).click();
    await page.getByLabel("Name").fill("Rice");
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(page.getByRole("cell", { name: "Rice" })).toBeVisible();

    // Expense ₹500.
    await page.getByRole("link", { name: "Expenses", exact: true }).click();
    await page.getByRole("button", { name: "Add expense" }).click();
    await page.getByLabel("Category").fill("Rent");
    await page.getByLabel("Amount (₹)").fill("500");
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await expect(page.getByText("₹500.00")).toBeVisible();

    // Dashboard totals it.
    await page.getByRole("link", { name: "Dashboard", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();

    const expensesCard = page.getByText("Other expenses").locator("..");
    await expect(expensesCard).toContainText("₹500.00");

    const totalCard = page.getByText("Total spent").locator("..");
    await expect(totalCard).toContainText("₹500.00");
  });
});
