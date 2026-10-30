import { NavLink, Outlet } from "react-router-dom";

const LINKS = [
  { to: "/", label: "Dashboard", end: true },
  { to: "/suggestions", label: "Suggestions" },
  { to: "/chat", label: "Ask AI" },
  { to: "/items", label: "Items" },
  { to: "/purchases", label: "Purchases" },
  { to: "/purchases/new", label: "Add Purchase" },
  { to: "/stock-check", label: "Stock Check" },
  { to: "/expenses", label: "Expenses" },
  { to: "/reports", label: "Reports" },
  { to: "/settings", label: "Settings" },
];

export default function Layout() {
  return (
    <div className="flex min-h-screen bg-gray-50 text-gray-900">
      <aside className="flex w-56 shrink-0 flex-col border-r border-gray-200 bg-white">
        <div className="border-b border-gray-200 px-4 py-4">
          <span className="text-lg font-semibold">Stock Tracker</span>
        </div>
        <nav className="flex flex-col gap-1 p-2">
          {LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) =>
                `rounded px-3 py-2 text-sm ${
                  isActive ? "bg-gray-900 text-white" : "text-gray-700 hover:bg-gray-100"
                }`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="min-w-0 flex-1">
        <main className="mx-auto max-w-5xl p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
