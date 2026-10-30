import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Purchases from "./Purchases";
import { DbProvider } from "../lib/db-context";
import { listItems } from "../db/items";
import { listPurchases } from "../db/purchases";

vi.mock("../db/client", () => ({ getDb: vi.fn(() => ({})), pingDb: vi.fn() }));
vi.mock("../db/items", () => ({ listItems: vi.fn() }));
vi.mock("../db/purchases", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../db/purchases")>();
  return { ...actual, listPurchases: vi.fn() };
});

const ROW = {
  id: 1,
  date: "2026-10-30",
  itemId: 1,
  itemName: "Rice",
  unit: "kg",
  qtyBase: 2000,
  unitPricePaise: 1200,
  totalPaise: 2400,
  supplier: "Sri Traders",
  qtyRemaining: 1500,
};

function renderPage() {
  return render(
    <DbProvider url="postgresql://user:pass@localhost:5432/test">
      <Purchases />
    </DbProvider>,
  );
}

describe("Purchases list", () => {
  beforeEach(() => {
    vi.mocked(listItems).mockReset().mockResolvedValue([
      { id: 1, name: "Rice", unit: "kg", category: null, minStockBase: 0, stockLeftBase: 1500 },
    ]);
    vi.mocked(listPurchases).mockReset().mockResolvedValue([ROW]);
  });

  it("shows date, qty, unit price, total, supplier and batch remaining", async () => {
    renderPage();

    expect(await screen.findByText("Sri Traders")).toBeInTheDocument();
    expect(screen.getByText("2026-10-30")).toBeInTheDocument();
    expect(screen.getByText("2.00 kg")).toBeInTheDocument();
    expect(screen.getByText("₹12.00")).toBeInTheDocument();
    expect(screen.getByText("₹24.00")).toBeInTheDocument();
    expect(screen.getByText("1.50 kg")).toBeInTheDocument();
  });

  it("reloads with the chosen item filter", async () => {
    renderPage();
    const user = userEvent.setup();

    await screen.findByRole("option", { name: "Rice" });
    await user.selectOptions(screen.getByLabelText("Item"), "1");
    await user.click(screen.getByRole("button", { name: /apply/i }));

    expect(listPurchases).toHaveBeenLastCalledWith(expect.anything(), {
      itemId: 1,
      from: undefined,
      to: undefined,
    });
  });
});
