import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getDashboard, type DashboardData } from "../db/dashboard";
import { useDb } from "../lib/db-context";
import { useSuggestions } from "../lib/useSuggestions";
import { formatQuantity, formatRupees, type Unit } from "../logic/units";

function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function monthLabel(month: string): string {
  const [year, number] = month.split("-").map(Number);
  return `${MONTH_NAMES[number - 1] ?? month} ${year}`;
}

function Card({ label, value, tone }: { label: string; value: string; tone?: "warn" }) {
  return (
    <div className="rounded border border-gray-200 bg-white p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</p>
      <p className={`mt-1 text-xl font-semibold ${tone === "warn" ? "text-red-700" : ""}`}>
        {value}
      </p>
    </div>
  );
}

export default function Dashboard() {
  const db = useDb();
  const [month, setMonth] = useState(currentMonth);
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { suggestions, dismiss } = useSuggestions(db, month);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await getDashboard(db, month));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [db, month]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="text-sm text-gray-500">{monthLabel(month)}</p>
        </div>
        <div className="space-y-1">
          <label className="block text-xs font-medium text-gray-600" htmlFor="dashboard-month">
            Month
          </label>
          <input
            id="dashboard-month"
            type="month"
            className="rounded border border-gray-300 px-3 py-2 text-sm"
            value={month}
            onChange={(e) => setMonth(e.currentTarget.value)}
          />
        </div>
      </header>

      {error && (
        <p role="alert" className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {loading && !data && <p className="text-sm text-gray-500">Loading…</p>}

      {data && data.itemCount === 0 && (
        <section className="rounded border border-dashed border-gray-300 p-8 text-center">
          <p className="mb-3 text-gray-600">No items yet. Start by adding what you buy.</p>
          <Link
            to="/items"
            className="inline-block rounded bg-gray-900 px-4 py-2 text-sm font-medium text-white"
          >
            Add your first item
          </Link>
        </section>
      )}

      {data && data.itemCount > 0 && (
        <>
          <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Card label="Purchases" value={formatRupees(data.purchasesPaise)} />
            <Card label="Other expenses" value={formatRupees(data.expensesPaise)} />
            <Card label="Total spent" value={formatRupees(data.totalSpentPaise)} />
            <Card label="Cost of stock used" value={formatRupees(data.usedCostPaise)} />
            <Card label="Wastage cost" value={formatRupees(data.wastagePaise)} tone="warn" />
            <Card label="Stock value" value={formatRupees(data.stockValuePaise)} />
          </section>

          {data.priceAlerts.length > 0 && (
            <section className="space-y-2">
              <h2 className="text-lg font-medium">Price alerts</h2>
              <ul className="space-y-1 rounded border border-amber-200 bg-amber-50 p-3 text-sm">
                {data.priceAlerts.map((alert) => (
                  <li key={alert.itemId}>
                    <span className="font-medium">{alert.itemName}</span> — price rose from{" "}
                    {formatRupees(alert.previousPaise)} to {formatRupees(alert.latestPaise)} (
                    {Math.round(((alert.latestPaise - alert.previousPaise) / alert.previousPaise) * 100)}%
                    up)
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-medium">Suggestions</h2>
              <Link to="/suggestions" className="text-sm underline">
                View all
              </Link>
            </div>
            {suggestions.length === 0 ? (
              <p className="text-sm text-gray-500">Nothing to flag right now.</p>
            ) : (
              <ul className="space-y-2">
                {suggestions.slice(0, 3).map((suggestion) => (
                  <li
                    key={`${suggestion.type}:${suggestion.itemId ?? "all"}`}
                    className="flex items-start justify-between gap-3 rounded border border-gray-200 bg-white p-3"
                  >
                    <p className="text-sm">{suggestion.message}</p>
                    <button
                      type="button"
                      className="shrink-0 text-xs underline"
                      onClick={() => void dismiss(suggestion)}
                    >
                      Dismiss
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="space-y-2">
            <h2 className="text-lg font-medium">Low stock</h2>
            {data.lowStock.length === 0 ? (
              <p className="text-sm text-gray-500">Everything is above its minimum.</p>
            ) : (
              <ul className="divide-y divide-gray-100 rounded border border-gray-200 bg-white">
                {data.lowStock.map((item) => (
                  <li key={item.id} className="flex items-center justify-between px-3 py-2 text-sm">
                    <span className="font-medium">{item.name}</span>
                    <span className="flex items-center gap-3">
                      <span className="text-red-700">
                        {formatQuantity(item.stockLeftBase, item.unit as Unit)} left
                      </span>
                      <span className="text-gray-500">
                        min {formatQuantity(item.minStockBase, item.unit as Unit)}
                      </span>
                      <Link
                        to={`/purchases/new?item=${item.id}`}
                        className="rounded border border-gray-300 px-2 py-1 text-xs"
                      >
                        Add purchase
                      </Link>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <section className="space-y-2">
              <h2 className="text-lg font-medium">Last purchases</h2>
              <ul className="divide-y divide-gray-100 rounded border border-gray-200 bg-white text-sm">
                {data.lastPurchases.length === 0 && (
                  <li className="px-3 py-3 text-gray-500">No purchases yet.</li>
                )}
                {data.lastPurchases.map((row) => (
                  <li key={row.id} className="flex items-center justify-between px-3 py-2">
                    <span>
                      <span className="font-medium">{row.itemName}</span>
                      <span className="text-gray-500"> · {row.date}</span>
                    </span>
                    <span className="text-gray-700">
                      {formatQuantity(row.qtyBase, row.unit as Unit)} ·{" "}
                      {formatRupees(row.totalPaise)}
                    </span>
                  </li>
                ))}
              </ul>
            </section>

            <section className="space-y-2">
              <h2 className="text-lg font-medium">Last stock entries</h2>
              <ul className="divide-y divide-gray-100 rounded border border-gray-200 bg-white text-sm">
                {data.lastChecks.length === 0 && (
                  <li className="px-3 py-3 text-gray-500">No stock checks yet.</li>
                )}
                {data.lastChecks.map((row) => (
                  <li key={row.id} className="flex items-center justify-between px-3 py-2">
                    <span>
                      <span className="font-medium">{row.itemName}</span>
                      <span className="text-gray-500">
                        {" "}
                        · {row.type.toLowerCase().replace("_", " ")} · {row.date}
                      </span>
                    </span>
                    <span className="text-gray-700">
                      {formatQuantity(Math.abs(row.qtyChange), row.unit as Unit)} ·{" "}
                      {formatRupees(row.costPaise)}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </>
      )}
    </div>
  );
}
