import { test, expect, type Page } from "@playwright/test";

/**
 * Runs the real UI in Chromium with the Tauri backend replaced by a stub.
 * The stub mimics the five Rust commands and keeps "keychain" entries in
 * localStorage so a page reload looks like an app restart.
 *
 * This exercises the UI only — it does NOT test the OS keychain, argon2 or Neon.
 */
function keychainStub() {
  const KEY = "__kc_store__";
  const load = (): Record<string, string> => JSON.parse(localStorage.getItem(KEY) || "{}");
  const save = (s: Record<string, string>) => localStorage.setItem(KEY, JSON.stringify(s));
  (window as unknown as { __TAURI_INTERNALS__: unknown }).__TAURI_INTERNALS__ = {
    transformCallback: () => 1,
    unregisterCallback: () => {},
    convertFileSrc: (p: string) => p,
    invoke: async (cmd: string, args: Record<string, string> = {}) => {
      const store = load();
      if (cmd === "save_secret") {
        store[args.key] = args.value;
        save(store);
        return null;
      }
      if (cmd === "get_secret") return store[args.key] ?? null;
      if (cmd === "delete_secret") {
        delete store[args.key];
        save(store);
        return null;
      }
      if (cmd === "hash_pin") return `hash:${args.pin}`;
      if (cmd === "verify_pin") return args.hash === `hash:${args.pin}`;
      throw new Error(`unknown command: ${cmd}`);
    },
  };
}

const URL_FIELD = "Neon connection string";

async function open(page: Page) {
  await page.addInitScript(keychainStub);
  await page.goto("/");
}

async function completeSetup(page: Page, pin = "1234") {
  await page.getByLabel(URL_FIELD).fill("postgresql://user:pass@127.0.0.1:5432/db");
  await page.getByLabel("PIN", { exact: true }).fill(pin);
  await page.getByLabel("Confirm PIN").fill(pin);
  await page.getByRole("button", { name: "Save & continue" }).click();
}

test("first launch shows the setup screen", async ({ page }) => {
  await open(page);
  await expect(page.getByRole("heading", { name: "Set up Stock Tracker" })).toBeVisible();
});

test("setup rejects mismatched PINs", async ({ page }) => {
  await open(page);
  await page.getByLabel(URL_FIELD).fill("postgresql://user:pass@127.0.0.1:5432/db");
  await page.getByLabel("PIN", { exact: true }).fill("1234");
  await page.getByLabel("Confirm PIN").fill("4321");
  await page.getByRole("button", { name: "Save & continue" }).click();

  await expect(page.getByRole("alert")).toHaveText("PINs do not match");
});

test("setup → lock → dashboard, and a reload asks for the PIN", async ({ page }) => {
  await open(page);
  await completeSetup(page);

  await expect(page.getByRole("heading", { name: "Stock Tracker" })).toBeVisible();
  await expect(page.getByLabel("PIN", { exact: true })).toBeVisible();

  await page.getByLabel("PIN", { exact: true }).fill("1234");
  await page.getByRole("button", { name: "Unlock" }).click();
  await expect(page.getByText("Dashboard coming soon")).toBeVisible();

  // Sidebar is present.
  for (const label of ["Dashboard", "Items", "Purchases", "Add Purchase", "Stock Check", "Expenses", "Reports", "Settings"]) {
    await expect(page.getByRole("link", { name: label })).toBeVisible();
  }

  // "Restart": reload must ask for the PIN, not the URL.
  await page.reload();
  await expect(page.getByLabel("PIN", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Set up Stock Tracker" })).toHaveCount(0);
});

test("five wrong PINs lock the screen", async ({ page }) => {
  await open(page);
  await completeSetup(page);

  for (let i = 0; i < 5; i++) {
    await page.getByLabel("PIN", { exact: true }).fill("9999");
    await page.getByRole("button", { name: "Unlock" }).click();
    await expect(page.getByRole("alert")).toBeVisible();
  }

  await expect(page.getByRole("alert")).toContainText("Try again in");
  await expect(page.getByRole("button", { name: "Unlock" })).toBeDisabled();
});

test("sidebar navigation reaches Items and Add Purchase", async ({ page }) => {
  await open(page);
  await completeSetup(page);
  await page.getByLabel("PIN", { exact: true }).fill("1234");
  await page.getByRole("button", { name: "Unlock" }).click();

  await page.getByRole("link", { name: "Items" }).click();
  await expect(page.getByRole("heading", { name: "Items" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Add item" })).toBeVisible();

  await page.getByRole("link", { name: "Add Purchase" }).click();
  await expect(page.getByRole("heading", { name: "Add Purchase" })).toBeVisible();
  await expect(page.getByText("Total")).toBeVisible();
});
