import { NavLink, Outlet } from "react-router-dom";

type Link = { to: string; label: string; end?: boolean };

const GROUPS: { heading: string; links: Link[] }[] = [
  {
    heading: "Overview",
    links: [
      { to: "/", label: "Dashboard", end: true },
      { to: "/suggestions", label: "Suggestions" },
      { to: "/chat", label: "Ask AI" },
    ],
  },
  {
    heading: "Stock",
    links: [
      { to: "/items", label: "Items" },
      { to: "/purchases", label: "Purchases" },
      { to: "/purchases/new", label: "Add Purchase" },
      { to: "/stock-check", label: "Stock Check" },
      { to: "/billing", label: "GST Billing" },
      { to: "/sales", label: "Sales" },
    ],
  },
  {
    heading: "Money",
    links: [
      { to: "/expenses", label: "Expenses" },
      { to: "/reports", label: "Reports" },
    ],
  },
  {
    heading: "System",
    links: [{ to: "/settings", label: "Settings" }],
  },
];

export default function Layout() {
  return (
    <div className="flex min-h-screen bg-[#f7f6f4] text-stone-900">
      <aside className="flex w-60 shrink-0 flex-col bg-stone-900 text-stone-100">
        <div className="flex items-center gap-3 border-b border-white/10 px-5 py-5">
          <span className="grid size-9 place-items-center rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 text-sm font-semibold text-white shadow-sm">
            ST
          </span>
          <span>
            <span className="block text-[15px] font-semibold tracking-tight text-white">
              Stock Tracker
            </span>
            <span className="block text-[11px] text-stone-400">Inventory &amp; costing</span>
          </span>
        </div>

        <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-3 py-4">
          {GROUPS.map((group) => (
            <div key={group.heading} className="mb-3">
              <p className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-stone-500">
                {group.heading}
              </p>
              <div className="flex flex-col gap-0.5">
                {group.links.map((link) => (
                  <NavLink
                    key={link.to}
                    to={link.to}
                    end={link.end}
                    className={({ isActive }) =>
                      `rounded-lg px-3 py-2 text-sm transition-colors ${
                        isActive
                          ? "bg-white/10 font-medium text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
                          : "text-stone-400 hover:bg-white/5 hover:text-white"
                      }`
                    }
                  >
                    {link.label}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        <p className="border-t border-white/10 px-5 py-3 text-[11px] text-stone-500">
          Local desktop app · PIN protected
        </p>
      </aside>

      <div className="min-w-0 flex-1">
        <main className="mx-auto max-w-6xl px-8 py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
