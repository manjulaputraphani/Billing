import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Dashboard from "./Dashboard";
import { DbProvider } from "../lib/db-context";
import { getDashboard, type DashboardData } from "../db/dashboard";

vi.mock("../db/client", () => ({ getDb: vi.fn(() => ({})), pingDb: vi.fn() }));
vi.mock("../db/dashboard", () => ({ getDashboard: vi.fn() }));

const DATA: DashboardData = {
  month: "2026-10",
  purchasesPaise: 8600,
  expensesPaise: 50000,
  totalSpentPaise: 58600,
  usedCostPaise: 6200,
  wastagePaise: 0,
  stockValuePaise: 2400,
  itemCount: 1,
  lowStock: [
    { id: 1, name: "Rice", unit: "kg", stockLeftBase: 2000, minStockBase: 3000 },
  ],
  lastPurchases: [
    {
      id: 2,
      date: "2026-10-03",
      itemName: "Rice",
      unit: "kg",
      qtyBase: 3000,
      totalPaise: 3600,
      supplier: "Sri Traders",
    },
  ],
  lastChecks: [
    {
      id: 5,
      date: "2026-10-04",
      itemName: "Rice",
      unit: "kg",
      type: "STOCK_CHECK",
      qtyChange: -2000,
      costPaise: 2200,
    },
  ],
  priceAlerts: [
    { itemId: 1, itemName: "Rice", unit: "kg", previousPaise: 1000, latestPaise: 1200 },
  ],
};

function renderPage() {
  return render(
    <MemoryRouter>
      <DbProvider url="postgresql://user:pass@localhost:5432/test">
        <Dashboard />
      </DbProvider>
    </MemoryRouter>,
  );
}

describe("Dashboard", () => {
  beforeEach(() => {
    vi.mocked(getDashboard).mockReset().mockResolvedValue(DATA);
  });

  it("renders the six cards from SQL data", async () => {
    renderPage();

    expect(await screen.findByText("Purchases")).toBeInTheDocument();
    expect(screen.getByText("₹86.00")).toBeInTheDocument();
    expect(screen.getByText("Other expenses")).toBeInTheDocument();
    expect(screen.getByText("₹500.00")).toBeInTheDocument();
    expect(screen.getByText("Total spent")).toBeInTheDocument();
    expect(screen.getByText("₹586.00")).toBeInTheDocument();
    expect(screen.getByText("Cost of stock used")).toBeInTheDocument();
    expect(screen.getByText("₹62.00")).toBeInTheDocument();
    expect(screen.getByText("Wastage cost")).toBeInTheDocument();
    expect(screen.getByText("Stock value")).toBeInTheDocument();
    expect(screen.getByText("₹24.00")).toBeInTheDocument();
  });

  it("lists low stock with a link that preselects the item", async () => {
    renderPage();

    const link = await screen.findByRole("link", { name: "Add purchase" });
    expect(link).toHaveAttribute("href", "/purchases/new?item=1");
    expect(screen.getByText("2.00 kg left")).toBeInTheDocument();
  });

  it("shows price alerts", async () => {
    renderPage();
    expect(await screen.findByText(/price rose from ₹10\.00 to ₹12\.00/)).toBeInTheDocument();
  });

  it("shows the empty state for a new user", async () => {
    vi.mocked(getDashboard).mockResolvedValue({
      ...DATA,
      itemCount: 0,
      purchasesPaise: 0,
      expensesPaise: 0,
      totalSpentPaise: 0,
      usedCostPaise: 0,
      wastagePaise: 0,
      stockValuePaise: 0,
      lowStock: [],
      lastPurchases: [],
      lastChecks: [],
      priceAlerts: [],
    });
    renderPage();

    expect(await screen.findByRole("link", { name: "Add your first item" })).toBeInTheDocument();
    expect(screen.queryByText("Purchases")).not.toBeInTheDocument();
  });
});
