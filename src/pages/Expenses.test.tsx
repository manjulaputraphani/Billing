import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Expenses from "./Expenses";
import { DbProvider } from "../lib/db-context";
import {
  createExpense,
  deleteExpense,
  listExpenses,
  listExpenseCategories,
  updateExpense,
} from "../db/expenses";

vi.mock("../db/client", () => ({ getDb: vi.fn(() => ({})), pingDb: vi.fn() }));

vi.mock("../db/expenses", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../db/expenses")>();
  return {
    ...actual,
    listExpenses: vi.fn(),
    listExpenseCategories: vi.fn(),
    createExpense: vi.fn(),
    updateExpense: vi.fn(),
    deleteExpense: vi.fn(),
  };
});

const ROWS = [
  {
    id: 1,
    category: "Rent",
    amountPaise: 50000,
    date: "2026-10-05",
    paymentMode: "Cash",
    note: null,
  },
  {
    id: 2,
    category: "Transport",
    amountPaise: 2500,
    date: "2026-10-06",
    paymentMode: "UPI",
    note: "Delivery",
  },
];

function renderPage() {
  return render(
    <DbProvider url="postgresql://user:pass@localhost:5432/test">
      <Expenses />
    </DbProvider>,
  );
}

describe("Expenses page", () => {
  beforeEach(() => {
    vi.mocked(listExpenses).mockReset().mockResolvedValue(ROWS);
    vi.mocked(listExpenseCategories).mockReset().mockResolvedValue(["Rent", "Transport"]);
    vi.mocked(createExpense).mockReset();
    vi.mocked(updateExpense).mockReset();
    vi.mocked(deleteExpense).mockReset();
  });

  it("shows the rows and the month total", async () => {
    renderPage();

    expect(await screen.findByText("Rent")).toBeInTheDocument();
    expect(screen.getByText("₹500.00")).toBeInTheDocument();
    expect(screen.getByText("₹25.00")).toBeInTheDocument();
    expect(screen.getByText("Month total")).toBeInTheDocument();
    expect(screen.getByText("₹525.00")).toBeInTheDocument();
  });

  it("requires a category before saving", async () => {
    renderPage();
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: "Add expense" }));
    const dialog = screen.getByRole("dialog");
    await user.type(within(dialog).getByLabelText("Amount (₹)"), "500");
    await user.click(within(dialog).getByRole("button", { name: "Save" }));

    expect(await within(dialog).findByRole("alert")).toHaveTextContent("Category is required");
    expect(createExpense).not.toHaveBeenCalled();
  });

  it("rejects a zero amount", async () => {
    renderPage();
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: "Add expense" }));
    const dialog = screen.getByRole("dialog");
    await user.type(within(dialog).getByLabelText("Category"), "Rent");
    await user.type(within(dialog).getByLabelText("Amount (₹)"), "0");
    await user.click(within(dialog).getByRole("button", { name: "Save" }));

    expect(await within(dialog).findByRole("alert")).toHaveTextContent(
      "Amount must be more than 0",
    );
    expect(createExpense).not.toHaveBeenCalled();
  });

  it("saves an expense with the amount converted to paise", async () => {
    renderPage();
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: "Add expense" }));
    const dialog = screen.getByRole("dialog");
    await user.type(within(dialog).getByLabelText("Category"), "Electricity");
    await user.type(within(dialog).getByLabelText("Amount (₹)"), "1234.50");
    await user.click(within(dialog).getByRole("button", { name: "Save" }));

    expect(createExpense).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        category: "Electricity",
        amountPaise: 123450,
        paymentMode: "Cash",
      }),
    );
  });
});
