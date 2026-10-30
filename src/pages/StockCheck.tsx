import { useEffect, useMemo, useState, type FormEvent } from "react";
import { listItems, type ItemRow } from "../db/items";
import { listOpenBatches, planStockEntry, saveStockEntry, type OpenBatch, type StockEntryType } from "../db/stock";
import { useDb, useDbUrl } from "../lib/db-context";
import { baseFactor, formatQuantity, formatRupees, toBase, type Unit } from "../logic/units";

const MODES: { type: StockEntryType; label: string }[] = [
  { type: "STOCK_CHECK", label: "Stock left" },
  { type: "USAGE", label: "Used" },
  { type: "WASTAGE", label: "Wastage" },
];

function todayLocal(): string {
  const d = new Date();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${month}-${day}`;
}

export default function StockCheck() {
  const db = useDb();
  const url = useDbUrl();

  const [items, setItems] = useState<ItemRow[]>([]);
  const [itemId, setItemId] = useState<number | "">("");
  const [type, setType] = useState<StockEntryType>("STOCK_CHECK");
  const [input, setInput] = useState("");
  const [date, setDate] = useState(todayLocal);
  const [note, setNote] = useState("");
  const [batches, setBatches] = useState<OpenBatch[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        setItems(await listItems(db));
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
    if (itemId === "" || input.trim() === "") return null;
    const base = toBase(Number(input) || 0, unit);
    try {
      return {
        plan: planStockEntry(
          batches,
          {
            type,
            enteredLeft: type === "STOCK_CHECK" ? base : null,
            qty: type === "STOCK_CHECK" ? null : base,
          },
          factor,
        ),
        error: null as string | null,
      };
    } catch (err) {
      return { plan: null, error: err instanceof Error ? err.message : String(err) };
    }
  }, [batches, factor, input, itemId, type, unit]);

  async function save(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    if (preview?.error) {
      setError(preview.error);
      return;
    }
    setSaving(true);
    try {
      const base = toBase(Number(input) || 0, unit);
      const result = await saveStockEntry(url, {
        itemId: itemId === "" ? undefined : itemId,
        type,
        enteredLeft: type === "STOCK_CHECK" ? base : null,
        qty: type === "STOCK_CHECK" ? null : base,
        date,
        note,
      });
      setSuccess(
        `Saved — used ${formatQuantity(result.used, unit)}, cost ${formatRupees(result.costPaise)}`,
      );
      setInput("");
      setNote("");
      if (itemId !== "") setBatches(await listOpenBatches(db, itemId));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <h1 className="page-title">Stock Check</h1>

      <form className="max-w-2xl space-y-4 card p-4" onSubmit={save}>
        <div className="space-y-1">
          <label className="label" htmlFor="stock-item">
            Item
          </label>
          <select
            id="stock-item"
            className="input w-full"
            value={itemId}
            onChange={(e) => {
              setItemId(e.currentTarget.value === "" ? "" : Number(e.currentTarget.value));
              setInput("");
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
          <div className="rounded bg-gray-50 p-3 text-sm">
            <p className="font-medium">
              Current stock: {formatQuantity(currentStock, unit)}
            </p>
            {batches.length === 0 ? (
              <p className="text-gray-500">No open batches for this item.</p>
            ) : (
              <ul className="mt-1 space-y-0.5 text-gray-600">
                {batches.map((b) => (
                  <li key={b.id}>
                    {formatQuantity(b.qtyRemaining, unit)} @ {formatRupees(b.unitPricePaise)} (
                    {b.purchaseDate})
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <div className="flex gap-2">
          {MODES.map((mode) => (
            <button
              key={mode.type}
              type="button"
              className={`rounded px-3 py-1 text-sm ${
                type === mode.type ? "bg-gray-900 text-white" : "border border-gray-300"
              }`}
              onClick={() => {
                setType(mode.type);
                setInput("");
                setError(null);
                setSuccess(null);
              }}
            >
              {mode.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="label" htmlFor="stock-input">
              {type === "STOCK_CHECK" ? `Stock left (${unit})` : `Quantity ${type === "USAGE" ? "used" : "wasted"} (${unit})`}
            </label>
            <input
              id="stock-input"
              type="number"
              step="any"
              className="input w-full"
              value={input}
              onChange={(e) => setInput(e.currentTarget.value)}
            />
          </div>

          <div className="space-y-1">
            <label className="label" htmlFor="stock-date">
              Date
            </label>
            <input
              id="stock-date"
              type="date"
              className="input w-full"
              value={date}
              onChange={(e) => setDate(e.currentTarget.value)}
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="label" htmlFor="stock-note">
            Note (optional)
          </label>
          <input
            id="stock-note"
            className="input w-full"
            value={note}
            onChange={(e) => setNote(e.currentTarget.value)}
          />
        </div>

        {preview?.error && (
          <p role="alert" className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">
            {preview.error}
          </p>
        )}

        {preview?.plan && (
          <div className="space-y-1 rounded border border-gray-200 bg-gray-50 px-3 py-2 text-sm" role="status">
            <p>
              Used {formatQuantity(preview.plan.used, unit)} · Cost{" "}
              {formatRupees(preview.plan.totalCostPaise)}
            </p>
            {preview.plan.takes.length > 0 && (
              <p className="text-gray-600">
                From:{" "}
                {preview.plan.takes
                  .map((t) => `${formatQuantity(t.qty, unit)} @ ${formatRupees(t.unitPricePaise)}`)
                  .join(" + ")}
              </p>
            )}
            <p className="text-gray-600">
              Left {formatQuantity(preview.plan.leftQty, unit)} worth{" "}
              {formatRupees(preview.plan.leftValuePaise)}
            </p>
          </div>
        )}

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

        <button
          type="submit"
          className="w-full btn-primary"
          disabled={saving || !preview?.plan}
        >
          Confirm
        </button>
      </form>
    </div>
  );
}
