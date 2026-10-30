import { useCallback, useEffect, useState } from "react";
import { listItems, type ItemRow } from "../db/items";
import { listPurchases, type PurchaseListRow } from "../db/purchases";
import { useDb } from "../lib/db-context";
import { formatQuantity, formatRupees, type Unit } from "../logic/units";

export default function Purchases() {
  const db = useDb();
  const [items, setItems] = useState<ItemRow[]>([]);
  const [rows, setRows] = useState<PurchaseListRow[]>([]);
  const [itemId, setItemId] = useState<number | "">("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const list = await listItems(db);
        if (!cancelled) setItems(list);
      } catch {
        /* the item filter is optional — a failure here should not block the table */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [db]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setRows(
        await listPurchases(db, {
          itemId: itemId === "" ? undefined : itemId,
          from: from || undefined,
          to: to || undefined,
        }),
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [db, itemId, from, to]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">Purchases</h1>

      <div className="flex flex-wrap items-end gap-3 rounded border border-gray-200 bg-white p-3">
        <div className="space-y-1">
          <label className="block text-xs font-medium text-gray-600" htmlFor="filter-item">
            Item
          </label>
          <select
            id="filter-item"
            className="rounded border border-gray-300 px-3 py-2 text-sm"
            value={itemId}
            onChange={(e) => setItemId(e.currentTarget.value === "" ? "" : Number(e.currentTarget.value))}
          >
            <option value="">All items</option>
            {items.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <label className="block text-xs font-medium text-gray-600" htmlFor="filter-from">
            From
          </label>
          <input
            id="filter-from"
            type="date"
            className="rounded border border-gray-300 px-3 py-2 text-sm"
            value={from}
            onChange={(e) => setFrom(e.currentTarget.value)}
          />
        </div>

        <div className="space-y-1">
          <label className="block text-xs font-medium text-gray-600" htmlFor="filter-to">
            To
          </label>
          <input
            id="filter-to"
            type="date"
            className="rounded border border-gray-300 px-3 py-2 text-sm"
            value={to}
            onChange={(e) => setTo(e.currentTarget.value)}
          />
        </div>

        <button
          type="button"
          className="rounded border border-gray-300 px-3 py-2 text-sm"
          onClick={() => void load()}
        >
          Apply
        </button>
      </div>

      {error && (
        <p role="alert" className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="overflow-x-auto rounded border border-gray-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-200 bg-gray-50 text-gray-600">
            <tr>
              <th className="px-3 py-2">Date</th>
              <th className="px-3 py-2">Item</th>
              <th className="px-3 py-2 text-right">Qty</th>
              <th className="px-3 py-2 text-right">Unit price</th>
              <th className="px-3 py-2 text-right">Total</th>
              <th className="px-3 py-2">Supplier</th>
              <th className="px-3 py-2 text-right">Batch left</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td className="px-3 py-4 text-gray-500" colSpan={7}>
                  Loading…
                </td>
              </tr>
            )}
            {!loading && rows.length === 0 && (
              <tr>
                <td className="px-3 py-4 text-gray-500" colSpan={7}>
                  No purchases yet.
                </td>
              </tr>
            )}
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-gray-100 last:border-0">
                <td className="px-3 py-2">{row.date}</td>
                <td className="px-3 py-2 font-medium">{row.itemName}</td>
                <td className="px-3 py-2 text-right">
                  {formatQuantity(row.qtyBase, row.unit as Unit)}
                </td>
                <td className="px-3 py-2 text-right">{formatRupees(row.unitPricePaise)}</td>
                <td className="px-3 py-2 text-right">{formatRupees(row.totalPaise)}</td>
                <td className="px-3 py-2 text-gray-600">{row.supplier ?? "—"}</td>
                <td className="px-3 py-2 text-right">
                  {formatQuantity(row.qtyRemaining, row.unit as Unit)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
