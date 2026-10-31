import { useEffect, useMemo, useState, type FormEvent } from "react";
import { listItems, type ItemRow } from "../db/items";
import { listOpenBatches, type OpenBatch } from "../db/stock";
import { listSales, saveSale, type SaleRow } from "../db/sales";
import { planSale } from "../logic/sales";
import { useDb, useDbUrl } from "../lib/db-context";
import { baseFactor, formatQuantity, formatRupees, toBase, type Unit } from "../logic/units";

function todayLocal(): string {
  const d = new Date();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${month}-${day}`;
}

export default function Sales() {
  const db = useDb();
  const url = useDbUrl();

  const [items, setItems] = useState<ItemRow[]>([]);
  const [recent, setRecent] = useState<SaleRow[]>([]);
  const [itemId, setItemId] = useState<number | "">("");
  const [qty, setQty] = useState("");
  const [price, setPrice] = useState("");
  const [date, setDate] = useState(todayLocal);
  const [note, setNote] = useState("");
  const [batches, setBatches] = useState<OpenBatch[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        const [itemRows, saleRows] = await Promise.all([listItems(db), listSales(db)]);
        setItems(itemRows);
        setRecent(saleRows);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      }
    })();
  }, [db]);

  const selected = items.find((i) => i.id === itemId) ?? null;
  const unit: Unit = (selected?.unit as Unit) ?? "kg";
  const factor = baseFactor(unit);
  const currentStock = batches.reduce((sum, b) => sum + b.qtyRemaining, 0);

  useEffect(() => {
    if (itemId === "") {
      setBatches([]);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const rows = await listOpenBatches(db, itemId);
        if (!cancelled) setBatches(rows);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [db, itemId]);

  const preview = useMemo(() => {
    if (itemId === "" || qty.trim() === "" || price.trim() === "") return null;
    const base = toBase(Number(qty) || 0, unit);
    const pricePaise = Math.round((Number(price) || 0) * 100);
    try {
      return { plan: planSale(batches, base, pricePaise, factor), error: null as string | null };
    } catch (err) {
      return { plan: null, error: err instanceof Error ? err.message : String(err) };
    }
  }, [batches, factor, itemId, price, qty, unit]);

  async function save(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    if (preview?.error) {
      setError(preview.error);
      return;
    }
    if (!preview?.plan) return;
    setSaving(true);
    try {
      const base = toBase(Number(qty) || 0, unit);
      const pricePaise = Math.round((Number(price) || 0) * 100);
      const result = await saveSale(url, {
        itemId: itemId === "" ? undefined : itemId,
        qty: base,
        unitPricePaise: pricePaise,
        date,
        note,
      });
      setSuccess(
        `Saved — sold ${formatQuantity(result.qtyBase, unit)} for ${formatRupees(
          result.revenuePaise,
        )} · stock left ${formatQuantity(result.leftQty, unit)}`,
      );
      setQty("");
      setPrice("");
      setNote("");
      if (itemId !== "") setBatches(await listOpenBatches(db, itemId));
      setRecent(await listSales(db));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="page-title">Sales</h1>

      <form className="max-w-2xl space-y-4 card p-4" onSubmit={save}>
        <div className="space-y-1">
          <label className="label" htmlFor="sale-item">
            Item
          </label>
          <select
            id="sale-item"
            className="input w-full"
            value={itemId}
            onChange={(e) => {
              setItemId(e.currentTarget.value === "" ? "" : Number(e.currentTarget.value));
              setQty("");
              setPrice("");
              setError(null);
              setSuccess(null);
            }}
          >
            <option value="">Choose an item…</option>
            {items.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        </div>

        {itemId !== "" && (
          <p className="rounded bg-surface-2 px-3 py-2 text-sm">
            Current stock: {formatQuantity(currentStock, unit)}
          </p>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="label" htmlFor="sale-qty">
              Quantity sold ({unit})
            </label>
            <input
              id="sale-qty"
              type="number"
              step="any"
              className="input w-full"
              value={qty}
              onChange={(e) => setQty(e.currentTarget.value)}
            />
          </div>

          <div className="space-y-1">
            <label className="label" htmlFor="sale-price">
              Sale price (₹ per {unit})
            </label>
            <input
              id="sale-price"
              type="number"
              step="any"
              className="input w-full"
              value={price}
              onChange={(e) => setPrice(e.currentTarget.value)}
            />
          </div>

          <div className="space-y-1">
            <label className="label" htmlFor="sale-date">
              Date
            </label>
            <input
              id="sale-date"
              type="date"
              className="input w-full"
              value={date}
              onChange={(e) => setDate(e.currentTarget.value)}
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="label" htmlFor="sale-note">
            Note (optional)
          </label>
          <input
            id="sale-note"
            className="input w-full"
            value={note}
            onChange={(e) => setNote(e.currentTarget.value)}
          />
        </div>

        {preview?.error && (
          <p role="alert" className="rounded bg-error-soft px-3 py-2 text-sm text-error-ink">
            {preview.error}
          </p>
        )}

        {preview?.plan && (
          <div className="rounded border border-line bg-surface-2 px-3 py-2 text-sm" role="status">
            <p>
              Revenue {formatRupees(preview.plan.revenuePaise)} · Left{" "}
              {formatQuantity(preview.plan.leftQty, unit)}
            </p>
            <p className="text-ink">
              Cost {formatRupees(preview.plan.totalCostPaise)} · stock worth{" "}
              {formatRupees(preview.plan.leftValuePaise)}
            </p>
          </div>
        )}

        {error && (
          <p role="alert" className="rounded bg-error-soft px-3 py-2 text-sm text-error-ink">
            {error}
          </p>
        )}
        {success && !error && (
          <p role="status" className="rounded bg-success-soft px-3 py-2 text-sm text-success-ink">
            {success}
          </p>
        )}

        <button
          type="submit"
          className="w-full btn-primary"
          disabled={saving || !preview?.plan}
        >
          Save sale
        </button>
      </form>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Sold details</h2>
        {recent.length === 0 ? (
          <p className="text-sm text-muted">No sales yet.</p>
        ) : (
          <table className="w-full card text-sm">
            <thead>
              <tr className="border-b border-line text-left text-muted">
                <th className="px-3 py-2 font-medium">Date</th>
                <th className="px-3 py-2 font-medium">Item</th>
                <th className="px-3 py-2 font-medium">Qty</th>
                <th className="px-3 py-2 font-medium">Price</th>
                <th className="px-3 py-2 font-medium">Total</th>
                <th className="px-3 py-2 font-medium">Note</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((row) => (
                <tr key={row.id} className="border-b border-line last:border-0">
                  <td className="px-3 py-2">{row.soldAt}</td>
                  <td className="px-3 py-2">{row.itemName}</td>
                  <td className="px-3 py-2">{formatQuantity(row.qtyBase, row.unit as Unit)}</td>
                  <td className="px-3 py-2">
                    {formatRupees(row.unitPricePaise)} / {row.unit}
                  </td>
                  <td className="px-3 py-2">{formatRupees(row.totalPaise)}</td>
                  <td className="px-3 py-2 text-muted">{row.note ?? ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
