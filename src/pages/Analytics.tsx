import { useEffect, useMemo, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useDb } from "../lib/db-context";
import {
  capitalThrough,
  expensesByCategory,
  expensesByDay,
  expensesTotal,
  listBatches,
  profitByDay,
  profitByItem,
  salesByDay,
  salesSummary,
  stockValueByItem,
} from "../db/analytics";
import {
  capitalTurnover,
  changeIndicator,
  daysToRotateCapital,
  grossProfitPaise,
  inventoryTurnover,
  netProfitPaise,
  periodRange,
  profitPct,
  rupees,
  type PeriodKind,
} from "../logic/analytics";
import { Trend } from "../components/Trend";

const PALETTE = ["#C8963E", "#6F4E37", "#7A8B5A", "#B5714A", "#4E6E8E", "#8E6E8E"];

export default function Analytics() {
  const db = useDb();
  const [kind, setKind] = useState<PeriodKind>("month");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [data, setData] = useState<Awaited<ReturnType<typeof load>> | null>(null);

  async function load() {
    const period = periodRange(kind, new Date(), kind === "custom" ? { from, to } : undefined);
    const dayBefore = new Date(new Date(`${period.prevStart}T00:00:00Z`).getTime() - 86_400_000)
      .toISOString()
      .slice(0, 10);
    const [cur, prev, exp, expPrev, byDay, byCat, byItem, batches, stock, capOpen, capClose] =
      await Promise.all([
        salesSummary(db, period.start, period.end),
        salesSummary(db, period.prevStart, period.prevEnd),
        expensesTotal(db, period.start, period.end),
        expensesTotal(db, period.prevStart, period.prevEnd),
        Promise.all([salesByDay(db, period.start, period.end), profitByDay(db, period.start, period.end), expensesByDay(db, period.start, period.end)]),
        expensesByCategory(db, period.start, period.end),
        profitByItem(db, period.start, period.end),
        listBatches(db),
        stockValueByItem(db),
        capitalThrough(db, dayBefore),
        capitalThrough(db, period.end),
      ]);
    return { period, cur, prev, exp, expPrev, byDay, byCat, byItem, batches, stock, capOpen, capClose };
  }

  useEffect(() => {
    load().then(setData).catch(() => setData(null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [db, kind, from, to]);

  const view = useMemo(() => {
    if (!data) return null;
    const { period, cur, prev, exp, expPrev, stock, capOpen, capClose } = data;
    const gross = grossProfitPaise(cur.netSalesPaise, cur.cogsPaise);
    const grossPrev = grossProfitPaise(prev.netSalesPaise, prev.cogsPaise);
    const net = netProfitPaise(gross, exp);
    const netPrev = netProfitPaise(grossPrev, expPrev);
    const stockValue = stock.reduce((sum, row) => sum + Number(row.valuePaise), 0);
    const turnover = capitalTurnover(cur.netSalesPaise, capOpen, capClose);
    const turnoverPrev = capitalTurnover(prev.netSalesPaise, capOpen, capOpen + (capClose - capOpen));
    const invTurn = inventoryTurnover(cur.cogsPaise, stockValue, stockValue);
    const invTurnPrev = inventoryTurnover(prev.cogsPaise, stockValue, stockValue);
    const [salesRows, profitRows, expenseRows] = data.byDay;
    const dayMap = new Map<string, { sales: number; profit: number; expense: number }>();
    for (const r of salesRows) dayMap.set(r.day, { sales: Number(r.subtotalPaise) / 100, profit: 0, expense: 0 });
    for (const r of profitRows) {
      const e = dayMap.get(r.day) ?? { sales: 0, profit: 0, expense: 0 };
      e.profit = (Number(r.profitPaise) - (dayMap.get(r.day) ? 0 : 0)) / 100;
      dayMap.set(r.day, e);
    }
    for (const r of expenseRows) {
      const e = dayMap.get(r.day) ?? { sales: 0, profit: 0, expense: 0 };
      e.expense = Number(r.totalPaise) / 100;
      dayMap.set(r.day, e);
    }
    const lines = [...dayMap.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([day, v]) => ({ day: day.slice(5), sales: v.sales, net: v.profit - v.expense }));
    return {
      period,
      cards: [
        { label: "Total sales", value: rupees(cur.netSalesPaise), ind: changeIndicator(prev.netSalesPaise, cur.netSalesPaise) },
        { label: "COGS", value: rupees(cur.cogsPaise), ind: changeIndicator(prev.cogsPaise, cur.cogsPaise) },
        { label: "Gross profit", value: rupees(gross), ind: changeIndicator(grossPrev, gross) },
        { label: "Expenses", value: rupees(exp), ind: changeIndicator(expPrev, exp) },
        { label: "Net profit", value: rupees(net), ind: changeIndicator(netPrev, net) },
        { label: "Profit %", value: `${profitPct(net, cur.cogsPaise).toFixed(2)}%`, ind: changeIndicator(profitPct(netPrev, prev.cogsPaise), profitPct(net, cur.cogsPaise)) },
        { label: "Capital turnover", value: `${turnover.toFixed(2)}x`, ind: changeIndicator(turnoverPrev, turnover) },
        { label: "Days to rotate capital", value: daysToRotateCapital(period.days, turnover)?.toFixed(1) ?? "—", ind: changeIndicator(capitalTurnover(0, 0, 0), 0) },
        { label: "Remaining stock value", value: rupees(stockValue), ind: changeIndicator(0, 0) },
      ],
      lines,
      byCat: data.byCat.map((r) => ({ category: r.category, amount: Number(r.totalPaise) / 100 })),
      byItem: data.byItem.map((r) => ({ item: r.itemName, profit: Number(r.profitPaise) / 100 })).slice(-6),
      priceTrend: [...new Set(data.batches.map((b) => b.itemName))].slice(0, 6).map((name) => ({
        name,
        points: data.batches.filter((b) => b.itemName === name).map((b) => ({ day: b.purchaseDate.slice(5), price: b.buyUnitPaise / 100 })),
      })),
      donut: stock
        .filter((r) => Number(r.valuePaise) > 0)
        .map((r) => ({ name: r.itemName, value: Number(r.valuePaise) / 100 })),
      lowStock: stock.filter((r) => r.minStockBase > 0 && Number(r.qtyRemainingBase) <= r.minStockBase),
      invTurn,
      invTurnInd: changeIndicator(invTurnPrev, invTurn),
    };
  }, [data]);

  if (!data || !view) return <p className="text-sm text-muted">Loading analytics…</p>;

  return (
    <div className="space-y-4">
      <h1 className="page-title">Analytics</h1>
      <div className="flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <label className="label" htmlFor="analytics-period">Period</label>
          <select
            id="analytics-period"
            className="input"
            value={kind}
            onChange={(e) => setKind(e.currentTarget.value as PeriodKind)}
          >
            <option value="today">Today</option>
            <option value="week">This week</option>
            <option value="month">This month</option>
            <option value="custom">Custom range</option>
          </select>
        </div>
        {kind === "custom" && (
          <>
            <div className="space-y-1">
              <label className="label" htmlFor="analytics-from">From</label>
              <input id="analytics-from" type="date" className="input" value={from} onChange={(e) => setFrom(e.currentTarget.value)} />
            </div>
            <div className="space-y-1">
              <label className="label" htmlFor="analytics-to">To</label>
              <input id="analytics-to" type="date" className="input" value={to} onChange={(e) => setTo(e.currentTarget.value)} />
            </div>
          </>
        )}
        <p className="text-xs text-muted self-center">
          {data.period.start} → {data.period.end} · vs {data.period.prevStart} → {data.period.prevEnd}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {view.cards.map((card) => (
          <div key={card.label} className="card p-4">
            <p className="text-xs text-muted">{card.label}</p>
            <p className="text-lg font-semibold">{card.value}</p>
            <Trend ind={card.ind} />
          </div>
        ))}
      </div>

      <div className="card p-4">
        <h2 className="mb-2 text-sm font-semibold">Sales vs net profit (₹)</h2>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={view.lines}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="day" fontSize={11} />
            <YAxis fontSize={11} />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="sales" name="Sales" stroke="#C8963E" dot />
            <Line type="monotone" dataKey="net" name="Net profit" stroke="#7A8B5A" dot />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <div className="card p-4">
          <h2 className="mb-2 text-sm font-semibold">Expenses by category (₹)</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={view.byCat}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="category" fontSize={10} />
              <YAxis fontSize={11} />
              <Tooltip />
              <Bar dataKey="amount" name="Expenses" fill="#6F4E37" />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="card p-4">
          <h2 className="mb-2 text-sm font-semibold">Profit by item (₹)</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={view.byItem}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="item" fontSize={10} />
              <YAxis fontSize={11} />
              <Tooltip />
              <Bar dataKey="profit" name="Profit" fill="#7A8B5A" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card p-4">
        <h2 className="mb-2 text-sm font-semibold">Purchase price trend per item (₹)</h2>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="day" fontSize={11} allowDuplicatedCategory={false} />
            <YAxis fontSize={11} />
            <Tooltip />
            <Legend />
            {view.priceTrend.map((item, i) => (
              <Line key={item.name} data={item.points} dataKey="price" name={item.name} stroke={PALETTE[i % PALETTE.length]} dot />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <div className="card p-4">
          <h2 className="mb-2 text-sm font-semibold">Remaining stock value by item (₹)</h2>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={view.donut} dataKey="value" nameKey="name" innerRadius={45} outerRadius={80} label>
                {view.donut.map((_, i) => (
                  <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="card p-4">
          <h2 className="mb-2 text-sm font-semibold">Low stock</h2>
          {view.lowStock.length === 0 ? (
            <p className="text-sm text-muted">No item is below its minimum stock level.</p>
          ) : (
            <ul className="space-y-1 text-sm">
              {view.lowStock.map((row) => (
                <li key={row.itemId} className="flex justify-between">
                  <span>{row.itemName}</span>
                  <span className="badge badge-warn">{Number(row.qtyRemainingBase) / 1000} {row.unit} left (min {row.minStockBase / 1000})</span>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-xs text-muted">
            Inventory turnover (avg = current stock value): {view.invTurn.toFixed(2)}x <Trend ind={view.invTurnInd} />
          </p>
        </div>
      </div>
    </div>
  );
}