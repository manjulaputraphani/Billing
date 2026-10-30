import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Bills from "./Bills";
import { DbProvider } from "../lib/db-context";
import { cancelSaleBill, getSaleBill, listSaleBills, type SaleBillRow } from "../db/billing";
import { sendEmail } from "../lib/email";

vi.mock("../db/client", () => ({
  getDb: vi.fn(() => ({})),
  getTxDb: vi.fn(),
  withTransaction: vi.fn(),
  pingDb: vi.fn(),
}));
vi.mock("../db/billing", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../db/billing")>();
  return { ...actual, listSaleBills: vi.fn(), getSaleBill: vi.fn(), cancelSaleBill: vi.fn() };
});
vi.mock("../db/settings", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../db/settings")>();
  return {
    ...actual,
    getEmailSettings: vi.fn(async () => ({ fromEmail: "shop@example.com", fromName: "SDHHE", host: "smtp.gmail.com", port: "465" })),
    getShopDetails: vi.fn(async () => ({
      name: "SDHHE",
      address: "",
      phone: "",
      email: "",
      gstin: "36ABCDE1234F1Z5",
      bankName: "",
      bankAccount: "",
      bankIfsc: "",
      bankBranch: "",
    })),
  };
});
vi.mock("../lib/email", () => ({
  sendEmail: vi.fn(async () => {}),
  billEmailSubject: (billNo: string, shopName: string) => `Invoice ${billNo} — ${shopName}`,
}));
vi.mock("../db/activity", () => ({ logActivity: vi.fn(async () => {}) }));
vi.mock("../lib/secrets", () => ({
  getSecret: vi.fn(async () => "app-password"),
  SECRET_KEYS: { SMTP_PASSWORD: "SMTP_PASSWORD" },
}));
vi.mock("../lib/printBill", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../lib/printBill")>();
  return { ...actual, printBill: vi.fn() };
});

const URL = "postgresql://user:pass@localhost:5432/test";

const ROWS: SaleBillRow[] = [
  {
    id: 1,
    billNo: "SD-2026-000001",
    customerName: null,
    saleDate: "2026-10-30",
    totalPaise: 7875,
    paidPaise: 7875,
    paymentMode: "Cash",
    cancelled: false,
  },
  {
    id: 2,
    billNo: "SD-2026-000002",
    customerName: "Ravi",
    saleDate: "2026-10-29",
    totalPaise: 5000,
    paidPaise: 0,
    paymentMode: "Credit",
    cancelled: true,
  },
];

const DETAIL = {
  id: 1,
  billNo: "SD-2026-000001",
  saleDate: "2026-10-30",
  customerName: null,
  customerPhone: null,
  customerAddress: null,
  customerGstin: null,
      customerEmail: null,
  paymentMode: "Cash",
  subtotalPaise: 7500,
  discountPaise: 0,
  gstPaise: 375,
  gstRateBp: 500,
  totalPaise: 7875,
  paidPaise: 7875,
  cancelled: false,
  lines: [
    {
      itemName: "ROBUSTA P BERRY",
      unit: "kg",
      qtyBase: 500,
      unitPricePaise: 15000,
      hsnCode: "090111",
      lineTotalPaise: 7500,
      costPaise: 5000,
      profitPaise: 2500,
    },
  ],
};

function renderPage() {
  return render(
    <DbProvider url={URL}>
      <Bills />
    </DbProvider>,
  );
}

beforeEach(() => {
  vi.mocked(listSaleBills).mockReset().mockResolvedValue(ROWS);
  vi.mocked(getSaleBill).mockReset().mockResolvedValue(DETAIL);
  vi.mocked(cancelSaleBill).mockReset().mockResolvedValue({ restored: 1 });
});

describe("Bills list", () => {
  it("shows issued and cancelled bills", async () => {
    renderPage();
    expect(await screen.findByText("SD-2026-000001")).toBeInTheDocument();
    expect(screen.getByText("SD-2026-000002")).toBeInTheDocument();
    const table = screen.getByTestId("bills-table");
    expect(within(table).getByText("Issued")).toBeInTheDocument();
    expect(within(table).getByText("Cancelled")).toBeInTheDocument();
  });

  it("opens a bill to view its lines and totals", async () => {
    renderPage();
    const user = userEvent.setup();
    const [viewButton] = await screen.findAllByRole("button", { name: "View" });
    await user.click(viewButton);

    const detail = await screen.findByTestId("bills-detail");
    const html = screen.getByTestId("bill-preview-iframe").getAttribute("srcdoc") ?? "";
    expect(html).toContain("ROBUSTA P BERRY");
    expect(html).toContain("CGST");
    expect(html).toContain("₹78.75");
    expect(html).toContain("Amount in words:");
    expect(detail).toBeInTheDocument();
    expect(screen.getByTestId("bills-print")).toBeInTheDocument();
    expect(screen.getByTestId("bills-cancel")).toBeInTheDocument();
  });

  it("cancels after an in-app confirmation and reloads the list", async () => {
    renderPage();
    const user = userEvent.setup();
    await screen.findByText("SD-2026-000001");

    await user.click(screen.getByRole("button", { name: /^Cancel$/ }));
    expect(screen.getByTestId("bills-cancel-modal")).toBeInTheDocument();

    await user.click(screen.getByTestId("bills-confirm-cancel"));

    expect(cancelSaleBill).toHaveBeenCalledWith(URL, 1);
    expect(await screen.findByText(/SD-2026-000001 cancelled — stock restored/)).toBeInTheDocument();
    expect(listSaleBills).toHaveBeenCalledTimes(2);
  });

  it("emails the bill to the customer email", async () => {
    vi.mocked(getSaleBill).mockResolvedValue({ ...DETAIL, customerEmail: "buyer@example.com" });
    renderPage();
    const user = userEvent.setup();
    await screen.findByText("SD-2026-000001");
    const [viewButton] = screen.getAllByRole("button", { name: "View" });
    await user.click(viewButton);
    await screen.findByTestId("bills-detail");

    await user.click(screen.getByTestId("bills-email"));

    expect(sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: "buyer@example.com",
        subject: "Invoice SD-2026-000001 — SDHHE",
      }),
    );
    const call = vi.mocked(sendEmail).mock.calls[0][0];
    expect(call.html).toContain("ROBUSTA P BERRY");
    expect(await screen.findByText(/Emailed to buyer@example.com/)).toBeInTheDocument();
  });

  it("does not offer cancel for an already cancelled bill", async () => {
    renderPage();
    await screen.findByText("SD-2026-000002");
    expect(screen.getAllByRole("button", { name: /^Cancel$/ })).toHaveLength(1);
  });
});
