import { useEffect, useMemo, useState } from "react";
import {
  createCustomer,
  createSaleBill,
  getSaleBill,
  type SaleBillDetail,
} from "../db/billing";
import { listItems, type ItemRow } from "../db/items";
import { PAYMENT_MODES } from "../db/purchases";
import { getShopDetails, type ShopDetails } from "../db/settings";
import { useDb, useDbUrl } from "../lib/db-context";
import { printBill } from "../lib/printBill";
import { gstFromRate } from "../logic/gst";
import { rupeesToPaise } from "../logic/purchase";
import { baseFactor, formatQuantity, formatRupees, toBase, type Unit } from "../logic/units";

type Line = {
  itemId: number;
  name: string;
  unit: Unit;
  qtyBase: number;
  unitPricePaise: number;
  lineTotalPaise: number;
};

function todayLocal(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function Billing() {
  const db = useDb();
  const url = useDbUrl();

  const [items, setItems] = useState<ItemRow[]>([]);
  const [shop, setShop] = useState<ShopDetails | null>(null);
  const [date, setDate] = useState(todayLocal);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [draftItemId, setDraftItemId] = useState<number | "">("");
  const [draftQty, setDraftQty] = useState("");
  const [draftPrice, setDraftPrice] = useState("");
  const [lines, setLines] = useState<Line[]>([]);
  const [discount, setDiscount] = useState("");
  const [gstRateBp, setGstRateBp] = useState("500");
  const [paymentMode, setPaymentMode] = useState<string>("Cash");
  const [paid, setPaid] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [bill, setBill] = useState<SaleBillDetail | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const [itemRows, shopRow] = await Promise.all([listItems(db), getShopDetails(db)]);
        setItems(itemRows);
        setShop(shopRow);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      }
    })();
  }, [db]);

  const draftItem = items.find((i) => i.id === draftItemId) ?? null;
  const draftUnit: Unit = (draftItem?.unit as Unit) ?? "kg";

  const totals = useMemo(() => {
    const subtotalPaise = lines.reduce((sum, line) => sum + line.lineTotalPaise, 0);
    const discountPaise = rupeesToPaise(discount || "0");
    const taxablePaise = Math.max(0, subtotalPaise - discountPaise);
    const gstPaise = gstFromRate(taxablePaise, Number(gstRateBp) || 0);
    return { subtotalPaise, discountPaise, taxablePaise, gstPaise, totalPaise: taxablePaise + gstPaise };
  }, [discount, gstRateBp, lines]);

  function addLine() {
    setError(null);
    setSuccess(null);
    if (!draftItem) {
      setError("Choose an item");
      return;
    }
    const qtyBase = toBase(Number(draftQty) || 0, draftUnit);
    if (qtyBase <= 0) {
      setError("Enter a quantity");
      return;
    }
    const unitPricePaise = rupeesToPaise(draftPrice || "0");
    const factor = baseFactor(draftUnit);
    const lineTotalPaise = Math.round((qtyBase * unitPricePaise) / factor);
    setLines((prev) => [
      ...prev,
      {
        itemId: draftItem.id,
        name: draftItem.name,
        unit: draftUnit,
        qtyBase,
        unitPricePaise,
        lineTotalPaise,
      },
    ]);
    setDraftQty("");
    setDraftPrice("");
  }

  async function save() {
    setError(null);
    setSuccess(null);
    if (lines.length === 0) {
      setError("Add at least one item");
      return;
    }
    if (paymentMode === "Credit" && !customerName.trim()) {
      setError("Choose a customer for a credit sale");
      return;
    }
    setSaving(true);
    try {
      let customerId: number | undefined;
      if (customerName.trim()) {
        const customer = await createCustomer(db, { name: customerName, phone: customerPhone });
        customerId = customer.id;
      }
      const created = await createSaleBill(url, {
        customerId,
        date,
        paymentMode,
        paidPaise: paid.trim() ? rupeesToPaise(paid) : undefined,
        discountPaise: totals.discountPaise,
        gstPaise: totals.gstPaise,
        lines: lines.map((line) => ({
          itemId: line.itemId,
          qtyBase: line.qtyBase,
          unitPricePaise: line.unitPricePaise,
        })),
      });
      setSuccess(`Saved ${created.billNo} — ${formatRupees(created.totalPaise)}`);
      const detail = await getSaleBill(db, created.saleId);
      setBill(detail);
      setLines([]);
      setDiscount("");
      setPaid("");
      setCustomerName("");
      setCustomerPhone("");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "F2") {
        event.preventDefault();
        void save();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <div className="space-y-4">
      <h1 className="page-title">GST Billing</h1>

      {shop && !shop.name && (
        <p className="rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-800 ring-1 ring-amber-200/60">
          Add your shop name and GSTIN in Settings → Shop details so they print on the bill.
        </p>
      )}

      <form
        data-testid="billing-form"
        className="max-w-3xl space-y-4 card p-4"
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1">
            <label className="label" htmlFor="bill-date">
              Date
            </label>
            <input
              id="bill-date"
              type="date"
              className="input w-full"
              value={date}
              onChange={(e) => setDate(e.currentTarget.value)}
            />
          </div>
          <div className="space-y-1">
            <label className="label" htmlFor="bill-customer">
              Customer (optional)
            </label>
            <input
              id="bill-customer"
              className="input w-full"
              placeholder="Name"
              value={customerName}
              onChange={(e) => setCustomerName(e.currentTarget.value)}
            />
          </div>
          <div className="space-y-1">
            <label className="label" htmlFor="bill-phone">
              Phone
            </label>
            <input
              id="bill-phone"
              className="input w-full"
              placeholder="10 digits"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.currentTarget.value)}
            />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-[2fr_1fr_1fr_auto]">
          <div className="space-y-1">
            <label className="label" htmlFor="bill-item">
              Item
            </label>
            <select
              id="bill-item"
              className="input w-full"
              value={draftItemId}
              onChange={(e) => setDraftItemId(e.currentTarget.value === "" ? "" : Number(e.currentTarget.value))}
            >
              <option value="">Choose an item…</option>
              {items.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="label" htmlFor="bill-qty">
              Qty ({draftUnit})
            </label>
            <input
              id="bill-qty"
              type="number"
              step="any"
              className="input w-full"
              value={draftQty}
              onChange={(e) => setDraftQty(e.currentTarget.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addLine();
                }
              }}
            />
          </div>
          <div className="space-y-1">
            <label className="label" htmlFor="bill-price">
              Rate (₹ per {draftUnit})
            </label>
            <input
              id="bill-price"
              type="number"
              step="any"
              className="input w-full"
              value={draftPrice}
              onChange={(e) => setDraftPrice(e.currentTarget.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  addLine();
                }
              }}
            />
          </div>
          <div className="flex items-end">
            <button
              type="button"
              className="btn-ghost"
              data-testid="billing-add-line"
              onClick={addLine}
            >
              Add
            </button>
          </div>
        </div>

        {lines.length > 0 && (
          <table className="w-full text-left text-sm">
            <thead className="text-gray-500">
              <tr>
                <th className="py-1">Item</th>
                <th className="py-1">Qty</th>
                <th className="py-1">Rate</th>
                <th className="py-1 text-right">Amount</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {lines.map((line, index) => (
                <tr key={`${line.itemId}-${index}`} className="border-t border-gray-100">
                  <td className="py-1.5">{line.name}</td>
                  <td className="py-1.5">{formatQuantity(line.qtyBase, line.unit)}</td>
                  <td className="py-1.5">{formatRupees(line.unitPricePaise)}</td>
                  <td className="py-1.5 text-right">{formatRupees(line.lineTotalPaise)}</td>
                  <td className="py-1.5 text-right">
                    <button
                      type="button"
                      className="text-sm text-red-700 underline"
                      onClick={() => setLines((prev) => prev.filter((_, i) => i !== index))}
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <div className="grid gap-3 sm:grid-cols-4">
          <div className="space-y-1">
            <label className="label" htmlFor="bill-discount">
              Discount (₹)
            </label>
            <input
              id="bill-discount"
              type="number"
              step="any"
              className="input w-full"
              value={discount}
              onChange={(e) => setDiscount(e.currentTarget.value)}
            />
          </div>
          <div className="space-y-1">
            <label className="label" htmlFor="bill-gst">
              GST %
            </label>
            <select
              id="bill-gst"
              className="input w-full"
              value={gstRateBp}
              onChange={(e) => setGstRateBp(e.currentTarget.value)}
            >
              <option value="0">0%</option>
              <option value="500">5%</option>
              <option value="1200">12%</option>
              <option value="1800">18%</option>
              <option value="2800">28%</option>
            </select>
          </div>
          <div className="space-y-1">
            <label className="label" htmlFor="bill-payment">
              Payment
            </label>
            <select
              id="bill-payment"
              className="input w-full"
              value={paymentMode}
              onChange={(e) => setPaymentMode(e.currentTarget.value)}
            >
              {PAYMENT_MODES.map((mode) => (
                <option key={mode} value={mode}>
                  {mode}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="label" htmlFor="bill-paid">
              Paid (₹)
            </label>
            <input
              id="bill-paid"
              type="number"
              step="any"
              className="input w-full"
              placeholder="full"
              value={paid}
              onChange={(e) => setPaid(e.currentTarget.value)}
            />
          </div>
        </div>

        <div className="rounded-xl bg-stone-50 px-3 py-2 text-sm">
          Subtotal {formatRupees(totals.subtotalPaise)} · GST {formatRupees(totals.gstPaise)} ·{" "}
          <span className="font-semibold">Total {formatRupees(totals.totalPaise)}</span>
        </div>

        {error && (
          <p role="alert" className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}
        {success && !error && (
          <p role="status" className="rounded bg-green-50 px-3 py-2 text-sm text-green-700">
            {success}
          </p>
        )}

        <button type="submit" className="btn-primary" data-testid="billing-save" disabled={saving}>
          Save bill (F2)
        </button>
      </form>

      {bill && (
        <section data-testid="bill-preview" className="max-w-3xl space-y-3 card p-4">
          <h2 className="text-lg font-semibold tracking-tight">Bill {bill.billNo}</h2>
          <ul className="space-y-0.5 text-sm text-gray-600">
            {bill.lines.map((line) => (
              <li key={`${line.itemName}-${line.qtyBase}`}>
                {line.itemName} · {formatQuantity(line.qtyBase, line.unit as Unit)} ·{" "}
                {formatRupees(line.lineTotalPaise)}
              </li>
            ))}
          </ul>
          <p className="text-sm">
            Subtotal {formatRupees(bill.subtotalPaise)} · GST {formatRupees(bill.gstPaise)} · Total{" "}
            {formatRupees(bill.totalPaise)} · Paid {formatRupees(bill.paidPaise)}
          </p>
          <button
            type="button"
            className="btn-primary"
            data-testid="bill-print"
            onClick={() => shop && printBill(bill, shop)}
          >
            Print / Save PDF
          </button>
        </section>
      )}
    </div>
  );
}
