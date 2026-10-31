import { NavLink, Outlet } from "react-router-dom";
import CoffeeIcon from "./CoffeeIcon";
import ThemeToggle from "./ThemeToggle";

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
      { to: "/bills", label: "Bills" },
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
    <div className="flex min-h-screen bg-bg text-ink">
      <aside className="sticky top-0 flex h-screen w-60 shrink-0 flex-col overflow-y-auto bg-nav text-nav-text">
        <div className="flex items-center gap-3 border-b border-nav-line px-4 py-5">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-nav-text/15 text-nav-text">
            <CoffeeIcon />
          </span>
          <span className="min-w-0">
            <span className="block text-[11.5px] font-semibold uppercase leading-snug tracking-[0.08em] text-nav-text">
              SREE DURGA HARIHARA ENTERPRISES
            </span>
            <span className="mt-1 block text-[9.5px] uppercase tracking-[0.2em] text-nav-muted">
              Inventory · Billing · Accounts
            </span>
          </span>
        </div>

        <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-3 py-4">
          {GROUPS.map((group) => (
            <div key={group.heading} className="mb-3">
              <p className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-nav-muted">
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
                          ? "bg-nav-active font-medium text-nav-text shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
                          : "text-nav-muted hover:bg-nav-hover hover:text-nav-text"
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

        <div className="border-t border-nav-line px-5 py-3">
          <ThemeToggle onDark className="mb-3" />
          <p className="text-[11px] text-nav-muted">Local desktop · Member sign-in</p>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <main className="mx-auto max-w-6xl px-8 py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
