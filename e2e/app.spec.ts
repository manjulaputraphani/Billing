import { test, expect, type Page } from "@playwright/test";

/**
 * Full UI tour with the Tauri backend stubbed.
 *
 * The stub mimics the five Rust commands and keeps "keychain" entries in
 * localStorage, so page.reload() behaves like an app restart.
 *
 * NOT covered here (needs the real app / a test database):
 * keychain, argon2, and any query that writes to Neon.
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

// Port 59999 is closed on purpose: connecting must fail fast.
const DEAD_URL = "postgresql://user:pass@127.0.0.1:59999/db";

async function open(page: Page) {
  await page.addInitScript(keychainStub);
  await page.goto("/");
}

async function completeSetup(page: Page, pin = "1234") {
  await page.getByLabel("Neon connection string").fill(DEAD_URL);
  await page.getByLabel("PIN", { exact: true }).fill(pin);
  await page.getByLabel("Confirm PIN").fill(pin);
  await page.getByRole("button", { name: "Save & continue" }).click();
}

async function unlock(page: Page) {
  await open(page);
  await completeSetup(page);
  await page.getByLabel("PIN", { exact: true }).fill("1234");
  await page.getByRole("button", { name: "Unlock" }).click();
  await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
}

test.describe("setup", () => {
  test("first launch shows setup, not the lock screen", async ({ page }) => {
    await open(page);
    await expect(page.getByRole("heading", { name: "Set up Stock Tracker" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Unlock" })).toHaveCount(0);
  });

  test("rejects mismatched PINs", async ({ page }) => {
    await open(page);
    await page.getByLabel("Neon connection string").fill(DEAD_URL);
    await page.getByLabel("PIN", { exact: true }).fill("1234");
    await page.getByLabel("Confirm PIN").fill("4321");
    await page.getByRole("button", { name: "Save & continue" }).click();
    await expect(page.getByRole("alert")).toHaveText("PINs do not match");
  });

  test("rejects a PIN outside 4-6 digits", async ({ page }) => {
    await open(page);
    await page.getByLabel("Neon connection string").fill(DEAD_URL);
    await page.getByLabel("PIN", { exact: true }).fill("12");
    await page.getByLabel("Confirm PIN").fill("12");
    await page.getByRole("button", { name: "Save & continue" }).click();
    await expect(page.getByRole("alert")).toHaveText("PIN must be 4-6 digits");
  });

  test("shows 'Cannot connect' when the database is unreachable", async ({ page }) => {
    await open(page);
    await page.getByLabel("Neon connection string").fill(DEAD_URL);
    await page.getByRole("button", { name: "Test connection" }).click();
    await expect(page.getByRole("alert")).toHaveText(
      "Cannot connect - check the connection string",
    );
  });

  test("never echoes the full connection string", async ({ page }) => {
    await open(page);
    await page.getByLabel("Neon connection string").fill(DEAD_URL);
    await page.getByRole("button", { name: "Test connection" }).click();
    await expect(page.locator("body")).not.toContainText("pass@");
  });
});

test.describe("lock screen", () => {
  test("setup → lock → dashboard, and a reload asks for the PIN", async ({ page }) => {
    await open(page);
    await completeSetup(page);

    await expect(page.getByRole("heading", { name: "Stock Tracker" })).toBeVisible();
    await expect(page.getByLabel("PIN", { exact: true })).toBeVisible();

    await page.getByLabel("PIN", { exact: true }).fill("1234");
    await page.getByRole("button", { name: "Unlock" }).click();
    await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();

    await page.reload();
    await expect(page.getByLabel("PIN", { exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Set up Stock Tracker" })).toHaveCount(0);
  });

  test("shows an error for a wrong PIN", async ({ page }) => {
    await open(page);
    await completeSetup(page);
    await page.getByLabel("PIN", { exact: true }).fill("9999");
    await page.getByRole("button", { name: "Unlock" }).click();
    await expect(page.getByRole("alert")).toContainText("Wrong PIN");
  });

  test("locks out after five wrong PINs", async ({ page }) => {
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
});

test.describe("app shell", () => {
  test("every sidebar link renders its page", async ({ page }) => {
    await unlock(page);

    for (const label of [
      "Dashboard",
      "Items",
      "Purchases",
      "Add Purchase",
      "Stock Check",
      "Expenses",
      "Reports",
      "Settings",
    ]) {
      await expect(page.getByRole("link", { name: label })).toBeVisible();
    }

    for (const [link, heading] of [
      ["Items", "Items"],
      ["Purchases", "Purchases"],
      ["Add Purchase", "Add Purchase"],
      ["Stock Check", "Stock Check"],
      ["Expenses", "Expenses"],
      ["Settings", "Settings"],
    ] as const) {
      await page.getByRole("link", { name: link, exact: true }).click();
      await expect(page.getByRole("heading", { name: heading, exact: true })).toBeVisible();
    }

    for (const [link, heading] of [["Reports", "Reports"]] as const) {
      await page.getByRole("link", { name: link, exact: true }).click();
      await expect(page.getByRole("heading", { name: heading, exact: true })).toBeVisible();
      await expect(page.getByText("Coming soon")).toBeVisible();
    }
  });
});

test.describe("items", () => {
  test("shows the add-item modal and blocks an empty name", async ({ page }) => {
    await unlock(page);
    await page.getByRole("link", { name: "Items", exact: true }).click();
    await page.getByRole("button", { name: "Add item" }).click();

    const dialog = page.getByRole("dialog");
    await expect(dialog.getByRole("heading", { name: "Add item" })).toBeVisible();
    await dialog.getByRole("button", { name: "Save", exact: true }).click();
    await expect(dialog.getByRole("alert")).toHaveText("Name is required");

    await dialog.getByRole("button", { name: "Cancel" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
  });
});

test.describe("add purchase", () => {
  test("updates the total live and refuses to save without an item", async ({ page }) => {
    await unlock(page);
    await page.getByRole("link", { name: "Add Purchase", exact: true }).click();

    await page.getByLabel(/quantity/i).fill("2");
    await page.getByLabel(/unit price/i).fill("12");
    await expect(page.getByText("₹24.00")).toBeVisible();

    await page.getByRole("button", { name: "Save purchase" }).click();
    await expect(page.getByRole("alert")).toHaveText("Choose an item");
  });

  test("survives a negative price while typing", async ({ page }) => {
    await unlock(page);
    await page.getByRole("link", { name: "Add Purchase", exact: true }).click();

    await page.getByLabel(/quantity/i).fill("2");
    await page.getByLabel(/unit price/i).fill("-12");

    // The preview clamps to zero instead of crashing the screen.
    await expect(page.getByText("₹0.00")).toBeVisible();

    await page.getByRole("button", { name: "Save purchase" }).click();
    await expect(page.getByRole("alert")).toHaveText(/Price cannot be negative|Choose an item/);
  });
});

test.describe("settings", () => {
  test("reset asks in-app, cancel keeps the session, confirm returns to setup", async ({ page }) => {
    await unlock(page);
    await page.getByRole("link", { name: "Settings", exact: true }).click();

    await page.getByRole("button", { name: "Reset connection" }).click();
    await expect(page.getByRole("dialog")).toContainText("Reset connection?");

    await page.getByRole("button", { name: "Cancel" }).click();
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();

    await page.getByRole("button", { name: "Reset connection" }).click();
    await page.getByRole("button", { name: "Yes, reset" }).click();

    await expect(page.getByRole("heading", { name: "Set up Stock Tracker" })).toBeVisible();
    await page.reload();
    await expect(page.getByRole("heading", { name: "Set up Stock Tracker" })).toBeVisible();
  });
});
