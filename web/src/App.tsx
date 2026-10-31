import { useEffect, useState, type FormEvent } from "react";
import {
  api,
  money,
  qty,
  type ActivityRow,
  type BillDetail,
  type BillRow,
  type Item,
  type User,
} from "./api";
import { buildBillHtml } from "../../src/lib/printBill";
import type { ShopDetails } from "../../src/db/settings";

type View = "bills" | "items" | "activity";

export default function App() {
  const [checking, setChecking] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [view, setView] = useState<View>("bills");
  const [bills, setBills] = useState<BillRow[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [activity, setActivity] = useState<ActivityRow[]>([]);
  const [shop, setShop] = useState<ShopDetails | null>(null);
  const [bill, setBill] = useState<BillDetail | null>(null);
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api
      .me()
      .then(({ user }) => setUser(user))
      .catch(() => setUser(null))
      .finally(() => setChecking(false));
  }, []);

  useEffect(() => {
    if (!user) return;
    void Promise.all([api.bills().then((r) => setBills(r.bills)), api.items().then((r) => setItems(r.items)), api.activity().then((r) => setActivity(r.activity)), api.shop().then((r) => setShop(r.shop as unknown as ShopDetails))]).catch((err) =>
      setError(err instanceof Error ? err.message : String(err)),
    );
  }, [user]);

  async function signIn(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const { user } = await api.login(phone, password);
      setUser(user);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function openBill(id: number) {
    setError(null);
    try {
      setBill((await api.bill(id)).bill);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  if (checking) {
    return <main className="grid min-h-screen place-items-center text-sm text-stone-500">Loading…</main>;
  }

  if (!user) {
    return (
      <main className="grid min-h-screen place-items-center p-6">
        <div className="card w-full max-w-sm p-6">
          <div className="mb-6 flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 text-[9px] font-bold tracking-wider text-white">
              SDHHE
            </span>
            <div>
              <h1 className="text-[13px] font-semibold uppercase leading-snug tracking-wide">
                SREE DURGA HARIHARA ENTERPRISES
              </h1>
              <p className="text-sm text-stone-500">Sign in to the web edition.</p>
            </div>
          </div>
          <form className="space-y-4" onSubmit={signIn}>
            <div>
              <label className="label" htmlFor="phone">Phone number</label>
              <input id="phone" className="input" value={phone} onChange={(e) => setPhone(e.currentTarget.value)} autoFocus />
            </div>
            <div>
              <label className="label" htmlFor="password">Password</label>
              <input id="password" type="password" className="input" value={password} onChange={(e) => setPassword(e.currentTarget.value)} />
            </div>
            {error && <p role="alert" className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
            <button className="btn btn-primary w-full" type="submit" disabled={busy}>Sign in</button>
          </form>
        </div>
      </main>
    );
  }

  const tabs: { key: View; label: string }[] = [
    { key: "bills", label: "Invoices" },
    { key: "items", label: "Items" },
    { key: "activity", label: "Activity" },
  ];

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-56 shrink-0 flex-col bg-stone-900 px-3 py-5 text-stone-100">
        <div className="mb-6 flex items-center gap-3 px-2">
          <span className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 text-[8px] font-bold tracking-wider text-white">
            SDHHE
          </span>
          <span className="text-[10.5px] font-semibold uppercase leading-snug tracking-wider text-white">
            SREE DURGA HARIHARA ENTERPRISES
          </span>
        </div>
        <nav className="flex flex-col gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              className={`rounded-lg px-3 py-2 text-left text-sm ${view === tab.key ? "bg-white/10 font-medium text-white" : "text-stone-400 hover:bg-white/5 hover:text-white"}`}
              onClick={() => { setView(tab.key); setBill(null); }}
            >
              {tab.label}
            </button>
          ))}
        </nav>
        <div className="mt-auto space-y-1 px-2 pt-6 text-[11px] text-stone-500">
          <p className="text-stone-300">{user.name} · {user.role}</p>
          <button className="underline" onClick={() => void api.logout().then(() => setUser(null))}>Sign out</button>
        </div>
      </aside>

      <main className="min-w-0 flex-1 px-8 py-8">
        {error && <p role="alert" className="mb-4 rounded bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

        {view === "bills" && (
          <section className="space-y-4">
            <h1 className="text-2xl font-semibold tracking-tight">Invoices</h1>
            <div className="card overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr>
                    <th className="px-3 py-2">Bill no</th>
                    <th className="px-3 py-2">Date</th>
                    <th className="px-3 py-2">Customer</th>
                    <th className="px-3 py-2 text-right">Total</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {bills.map((row) => (
                    <tr key={row.id} className="border-t border-stone-100">
                      <td className="px-3 py-2 font-medium">{row.billNo}</td>
                      <td className="px-3 py-2">{row.saleDate}</td>
                      <td className="px-3 py-2">{row.customerName ?? "Walk-in"}</td>
                      <td className="px-3 py-2 text-right">{money(row.totalPaise)}</td>
                      <td className="px-3 py-2">
                        <span className={`rounded-full px-2 py-0.5 text-xs ${row.cancelled ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700"}`}>
                          {row.cancelled ? "Cancelled" : "Issued"}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right">
                        <button className="text-sm underline" onClick={() => void openBill(row.id)}>View</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {bill && shop && (
              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold tracking-tight">Bill preview</h2>
                  <button className="text-sm underline" onClick={() => setBill(null)}>Close</button>
                </div>
                <div className="overflow-hidden rounded-xl border border-stone-200 bg-white">
                  <iframe title={`Bill ${bill.billNo}`} className="h-[1080px] w-full" srcDoc={buildBillHtml(bill as never, shop)} />
                </div>
              </section>
            )}
          </section>
        )}

        {view === "items" && (
          <section className="space-y-4">
            <h1 className="text-2xl font-semibold tracking-tight">Items</h1>
            <div className="card overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr>
                    <th className="px-3 py-2">Item</th>
                    <th className="px-3 py-2">Unit</th>
                    <th className="px-3 py-2">Category</th>
                    <th className="px-3 py-2 text-right">Stock left</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id} className="border-t border-stone-100">
                      <td className="px-3 py-2 font-medium">{item.name}</td>
                      <td className="px-3 py-2">{item.unit}</td>
                      <td className="px-3 py-2">{item.category ?? "—"}</td>
                      <td className="px-3 py-2 text-right">{qty(item.stockLeftBase, item.unit)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {view === "activity" && (
          <section className="space-y-4">
            <h1 className="text-2xl font-semibold tracking-tight">Activity</h1>
            <div className="card p-4">
              <ul className="divide-y divide-stone-100 text-sm">
                {activity.map((row) => (
                  <li key={row.id} className="flex flex-wrap items-baseline justify-between gap-2 py-1.5">
                    <span>{row.summary}</span>
                    <span className="text-xs text-stone-500">
                      {new Date(row.at).toLocaleString("en-IN")} · {row.actor}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
