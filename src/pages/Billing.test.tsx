import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Billing from "./Billing";
import { DbProvider } from "../lib/db-context";
import { listItems } from "../db/items";
import { createCustomer, createSaleBill, getSaleBill } from "../db/billing";

vi.mock("../db/client", () => ({
  getDb: vi.fn(() => ({})),
  getTxDb: vi.fn(),
  withTransaction: vi.fn(),
  pingDb: vi.fn(),
}));
vi.mock("../db/items", () => ({ listItems: vi.fn() }));
vi.mock("../db/billing", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../db/billing")>();
  return { ...actual, createCustomer: vi.fn(), createSaleBill: vi.fn(), getSaleBill: vi.fn() };
});
vi.mock("../db/settings", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../db/settings")>();
  return {
    ...actual,
    getShopDetails: vi.fn(async () => ({ name: "SDHHE", address: "Main Road", phone: "99999", gstin: "36ABCDE1234F1Z5" })),
  };
});

const RICE = { id: 1, name: "Rice", unit: "kg", category: null, minStockBase: 0, stockLeftBase: 4000 };
const URL = "postgresql://user:pass@localhost:5432/test";

function renderPage() {
  return render(
    <DbProvider url={URL}>
      <Billing />
    </DbProvider>,
  );
}

async function addRiceLine() {
  const user = userEvent.setup();
  await screen.findByRole("option", { name: "Rice" });
  await user.selectOptions(screen.getByLabelText("Item"), "1");
  await user.type(screen.getByLabelText(/^Qty/), "2");
  await user.type(screen.getByLabelText(/^Rate/), "20");
  await user.click(screen.getByRole("button", { name: "Add" }));
  return user;
}

describe("GST billing", () => {
  beforeEach(() => {
    vi.mocked(listItems).mockReset().mockResolvedValue([RICE]);
    vi.mocked(createCustomer).mockReset();
    vi.mocked(createSaleBill).mockReset();
    vi.mocked(getSaleBill).mockReset();
  });

  it("adds a line and applies 5% GST", async () => {
    renderPage();
    await addRiceLine();

    expect(screen.getAllByText("Rice").length).toBeGreaterThan(1); // option + line
    expect(screen.getByText(/Total ₹42\.00/)).toBeInTheDocument();
  });

  it("saves the bill and shows the printable preview", async () => {
    vi.mocked(createSaleBill).mockResolvedValue({
      saleId: 7,
      billNo: "SD-2026-000001",
      subtotalPaise: 4000,
      totalPaise: 4200,
      profitPaise: 1600,
    });
    vi.mocked(getSaleBill).mockResolvedValue({
      id: 7,
      billNo: "SD-2026-000001",
      saleDate: "2026-10-31",
      customerName: null,
      customerPhone: null,
      paymentMode: "Cash",
      subtotalPaise: 4000,
      discountPaise: 0,
      gstPaise: 200,
      totalPaise: 4200,
      paidPaise: 4200,
      cancelled: false,
      lines: [
        {
          itemName: "Rice",
          unit: "kg",
          qtyBase: 2000,
          unitPricePaise: 2000,
          lineTotalPaise: 4000,
          costPaise: 2400,
          profitPaise: 1600,
        },
      ],
    });

    renderPage();
    const user = await addRiceLine();
    await user.click(screen.getByTestId("billing-save"));

    expect(createSaleBill).toHaveBeenCalledWith(
      URL,
      expect.objectContaining({
        paymentMode: "Cash",
        gstPaise: 200,
        lines: [{ itemId: 1, qtyBase: 2000, unitPricePaise: 2000 }],
      }),
    );
    expect(await screen.findByTestId("bill-preview")).toBeInTheDocument();
    expect(screen.getByText("Bill SD-2026-000001")).toBeInTheDocument();
    expect(screen.getByTestId("bill-print")).toBeInTheDocument();
  });

  it("refuses a credit bill without a customer", async () => {
    renderPage();
    const user = await addRiceLine();
    await user.selectOptions(screen.getByLabelText("Payment"), "Credit");
    await user.click(screen.getByTestId("billing-save"));

    expect(await screen.findByRole("alert")).toHaveTextContent("Choose a customer for a credit sale");
    expect(createSaleBill).not.toHaveBeenCalled();
  });
});
