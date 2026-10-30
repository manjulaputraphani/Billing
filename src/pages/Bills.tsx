import { useCallback, useEffect, useMemo, useState } from "react";
import {
  cancelSaleBill,
  getSaleBill,
  listSaleBills,
  type SaleBillDetail,
  type SaleBillRow,
} from "../db/billing";
import { getShopDetails, type ShopDetails } from "../db/settings";
import { useDb, useDbUrl } from "../lib/db-context";
import { printBill } from "../lib/printBill";
import { splitGst } from "../logic/gst";
import { formatQuantity, formatRupees, type Unit } from "../logic/units";

export default function Bills() {
  const db = useDb();
  const url = useDbUrl();

  const [rows, setRows] = useState<SaleBillRow[]>([]);
  const [shop, setShop] = useState<ShopDetails | null>(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"all" | "issued" | "cancelled">("all");
  const [detail, setDetail] = useState<SaleBillDetail | null>(null);
  const [cancelTarget, setCancelTarget] = useState<SaleBillRow | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const [bills, shopRow] = await Promise.all([listSaleBills(db, 100), getShopDetails(db)]);
    setRows(bills);
    setShop(shopRow);
  }, [db]);

  useEffect(() => {
    setLoading(true);
    load()
      .catch((err) => setError(err instanceof Error ? err.message : String(err)))
      .finally(() => setLoading(false));
  }, [load]);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (status === "cancelled" && !row.cancelled) return false;
      if (status === "issued" && row.cancelled) return false;
      if (!needle) return true;
      return (
        row.billNo.toLowerCase().includes(needle) ||
        (row.customerName ?? "").toLowerCase().includes(needle)
      );
    });
  }, [rows, search, status]);

  async function view(row: SaleBillRow) {
    setError(null);
    setSuccess(null);
    try {
      setDetail(await getSaleBill(db, row.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function confirmCancel() {
    if (!cancelTarget) return;
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      await cancelSaleBill(url, cancelTarget.id);
      setSuccess(`${cancelTarget.billNo} cancelled — stock restored`);
      setCancelTarget(null);
      setDetail(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="page-title">Bills</h1>

      <div className="flex max-w-3xl flex-wrap items-end gap-3">
        <div className="min-w-52 flex-1 space-y-1">
          <label className="label" htmlFor="bills-search">
            Search bill no / customer
          </label>
          <input
            id="bills-search"
            className="input w-full"
            value={search}
            onChange={(e) => setSearch(e.currentTarget.value)}
          />
        </div>
        <div className="space-y-1">
          <label className="label" htmlFor="bills-status">
            Status
          </label>
          <select
            id="bills-status"
            className="input"
            value={status}
            onChange={(e) => setStatus(e.currentTarget.value as typeof status)}
          >
            <option value="all">All bills</option>
            <option value="issued">Issued</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
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

      <div className="overflow-x-auto card" data-testid="bills-table">
        <table className="w-full text-left text-sm">
          <thead>
            <tr>
              <th className="px-3 py-2">Bill no</th>
              <th className="px-3 py-2">Date</th>
              <th className="px-3 py-2">Customer</th>
              <th className="px-3 py-2 text-right">Total</th>
              <th className="px-3 py-2 text-right">Paid</th>
              <th className="px-3 py-2">Payment</th>
              <th className="px-3 py-2">Status</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td className="px-3 py-4 text-gray-500" colSpan={8}>
                  Loading…
                </td>
              </tr>
            )}
            {!loading && filtered.length === 0 && (
              <tr>
                <td className="px-3 py-4 text-gray-500" colSpan={8}>
                  No bills yet — create one in GST Billing.
                </td>
              </tr>
            )}
            {filtered.map((row) => (
              <tr key={row.id} className="border-t border-gray-100">
                <td className="px-3 py-2 font-medium">{row.billNo}</td>
                <td className="px-3 py-2">{row.saleDate}</td>
                <td className="px-3 py-2">{row.customerName ?? "Walk-in"}</td>
                <td className="px-3 py-2 text-right">{formatRupees(row.totalPaise)}</td>
                <td className="px-3 py-2 text-right">{formatRupees(row.paidPaise)}</td>
                <td className="px-3 py-2">{row.paymentMode}</td>
                <td className="px-3 py-2">
                  {row.cancelled ? (
                    <span className="badge badge-bad">Cancelled</span>
                  ) : (
                    <span className="badge badge-ok">Issued</span>
                  )}
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-right">
                  <button
                    type="button"
                    className="mr-3 text-sm underline"
                    onClick={() => void view(row)}
                  >
                    View
                  </button>
                  {!row.cancelled && (
                    <button
                      type="button"
                      className="text-sm text-red-700 underline"
                      onClick={() => setCancelTarget(row)}
                    >
                      Cancel
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {detail && (
        <section data-testid="bills-detail" className="max-w-3xl space-y-3 card p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-lg font-semibold tracking-tight">{detail.billNo}</h2>
            {detail.cancelled ? (
              <span className="badge badge-bad">Cancelled</span>
            ) : (
              <span className="badge badge-ok">Issued</span>
            )}
          </div>
          <p className="text-sm text-gray-600">
            {detail.saleDate} · {detail.customerName ?? "Walk-in"}
            {detail.customerPhone ? ` · ${detail.customerPhone}` : ""} · {detail.paymentMode}
          </p>

          <ul className="space-y-0.5 text-sm text-gray-700">
            {detail.lines.map((line, index) => (
              <li key={`${line.itemName}-${index}`}>
                {line.itemName} · {formatQuantity(line.qtyBase, line.unit as Unit)} ·{" "}
                {formatRupees(line.unitPricePaise)} → {formatRupees(line.lineTotalPaise)}
              </li>
            ))}
          </ul>

          <div className="rounded-xl bg-stone-50 px-3 py-2 text-sm">
            Subtotal {formatRupees(detail.subtotalPaise)}
            {detail.discountPaise > 0 && ` − Discount ${formatRupees(detail.discountPaise)}`}
            {detail.gstPaise > 0 && (
              <>
                {" "}
                · CGST {formatRupees(splitGst(detail.gstPaise).cgstPaise)} · SGST{" "}
                {formatRupees(splitGst(detail.gstPaise).sgstPaise)}
              </>
            )}{" "}
            · <span className="font-semibold">Total {formatRupees(detail.totalPaise)}</span> · Paid{" "}
            {formatRupees(detail.paidPaise)}
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="btn-primary"
              data-testid="bills-print"
              onClick={() => shop && printBill(detail, shop)}
            >
              Print / Save PDF
            </button>
            {!detail.cancelled && (
              <button
                type="button"
                className="btn-ghost text-red-700 hover:bg-red-50"
                data-testid="bills-cancel"
                onClick={() => {
                  const row = rows.find((r) => r.id === detail.id) ?? null;
                  if (row) setCancelTarget(row);
                }}
              >
                Cancel bill
              </button>
            )}
          </div>
        </section>
      )}

      {cancelTarget && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="cancel-bill-title"
          data-testid="bills-cancel-modal"
          className="fixed inset-0 flex items-center justify-center bg-black/40 p-4"
        >
          <div className="w-full max-w-sm space-y-4 card p-5">
            <h2 id="cancel-bill-title" className="text-lg font-semibold">
              Cancel {cancelTarget.billNo}?
            </h2>
            <p className="text-sm text-gray-600">
              The bill stays visible as cancelled, and the sold quantity is put back into its
              original stock batches.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="btn-ghost"
                onClick={() => setCancelTarget(null)}
                disabled={busy}
              >
                Keep bill
              </button>
              <button
                type="button"
                className="rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                data-testid="bills-confirm-cancel"
                onClick={() => void confirmCancel()}
                disabled={busy}
              >
                Yes, cancel bill
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
