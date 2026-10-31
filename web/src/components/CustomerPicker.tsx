import { useMemo, useState } from "react";
import type { Customer } from "../api";

/**
 * Customer picker for the billing screen: search the master, pick a client and
 * their details fill the form. A client who is not in the master yet can
 * simply be typed in — the details are saved into the master with the bill.
 */
export default function CustomerPicker({
  customers,
  value,
  onPick,
  onSearch,
  placeholder = "Search saved customers…",
}: {
  customers: Customer[];
  value: Customer | null;
  onPick: (customer: Customer) => void;
  onSearch: (text: string) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  const shown = useMemo(() => {
    const text = query.trim().toLowerCase();
    const list = text
      ? customers.filter((customer) =>
          [customer.name, customer.phone, customer.gstin, customer.email]
            .filter(Boolean)
            .some((field) => String(field).toLowerCase().includes(text)),
        )
      : customers;
    return list.slice(0, 30);
  }, [customers, query]);

  return (
    <div className="relative">
      <button
        type="button"
        className="input flex w-full items-center gap-2 text-left"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary text-[11px] font-semibold text-on-primary">
          {(value?.name ?? "?").trim().charAt(0).toUpperCase() || "?"}
        </span>
        <span className="min-w-0 flex-1 truncate">
          {value ? value.name : <span className="text-muted">{placeholder}</span>}
        </span>
      </button>

      {open ? (
        <>
          <button
            type="button"
            aria-label="Close customer picker"
            className="fixed inset-0 z-20 cursor-default"
            onClick={() => setOpen(false)}
          />
          <div className="absolute left-0 right-0 z-30 mt-1 max-h-[min(18rem,45vh)] overflow-auto rounded-xl border border-line bg-surface p-1 shadow-lg">
            <input
              className="input mb-1"
              placeholder="Name, phone or GSTIN…"
              value={query}
              autoFocus
              onChange={(e) => {
                setQuery(e.currentTarget.value);
                onSearch(e.currentTarget.value);
              }}
            />
            {shown.length === 0 ? (
              <p className="px-2 py-3 text-center text-xs text-muted">
                No saved customer — type the details below and they will be saved.
              </p>
            ) : (
              <ul role="listbox">
                {shown.map((customer) => (
                  <li key={customer.id}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={value?.id === customer.id}
                      className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm ${
                        value?.id === customer.id ? "bg-surface-2 font-medium" : "hover:bg-surface-2"
                      }`}
                      onClick={() => {
                        onPick(customer);
                        setOpen(false);
                        setQuery("");
                      }}
                    >
                      <span className="grid size-8 shrink-0 place-items-center rounded-full bg-secondary-soft text-[11px] font-semibold text-secondary-ink">
                        {customer.name.trim().charAt(0).toUpperCase()}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate">{customer.name}</span>
                        <span className="block truncate text-[11px] text-muted">
                          {[customer.phone, customer.gstin].filter(Boolean).join(" · ") || "—"}
                        </span>
                      </span>
                      <span className="shrink-0 text-[11px] text-muted">{customer.billCount} bills</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}
