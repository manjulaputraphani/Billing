import { useCallback, useEffect, useState, type FormEvent } from "react";
import {
  createExpense,
  deleteExpense,
  EXPENSE_CATEGORIES,
  listExpenses,
  listExpenseCategories,
  parseExpenseInput,
  updateExpense,
  type ExpenseRow,
} from "../db/expenses";
import { PAYMENT_MODES } from "../db/purchases";
import { useDb } from "../lib/db-context";
import { rupeesToPaise } from "../logic/purchase";
import { formatRupees } from "../logic/units";

type FormState = {
  id: number | null;
  category: string;
  amount: string;
  date: string;
  paymentMode: string;
  note: string;
};

function todayLocal(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function currentMonth(): string {
  return todayLocal().slice(0, 7);
}

function emptyForm(): FormState {
  return { id: null, category: "", amount: "", date: todayLocal(), paymentMode: "Cash", note: "" };
}

export default function Expenses() {
  const db = useDb();
  const [rows, setRows] = useState<ExpenseRow[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [month, setMonth] = useState(currentMonth);
  const [categoryFilter, setCategoryFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [deleting, setDeleting] = useState<ExpenseRow | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [list, used] = await Promise.all([
        listExpenses(db, { month, category: categoryFilter || undefined }),
        listExpenseCategories(db),
      ]);
      setRows(list);
      setCategories(used);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [db, month, categoryFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  const totalPaise = rows.reduce((sum, row) => sum + row.amountPaise, 0);

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!form) return;
    setError(null);
    setBusy(true);
    try {
      const input = parseExpenseInput({
        category: form.category,
        amountPaise: rupeesToPaise(form.amount),
        date: form.date,
        paymentMode: form.paymentMode as (typeof PAYMENT_MODES)[number],
        note: form.note,
      });
      if (form.id === null) {
        await createExpense(db, input);
      } else {
        await updateExpense(db, form.id, input);
      }
      setForm(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function confirmDelete() {
    if (!deleting) return;
    setError(null);
    try {
      await deleteExpense(db, deleting.id);
      setDeleting(null);
      await load();
    } catch (err) {
      setDeleting(null);
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  const suggestions = [...new Set([...EXPENSE_CATEGORIES, ...categories])];

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <h1 className="page-title">Expenses</h1>
        <button
          type="button"
          className="btn-primary"
          onClick={() => {
            setError(null);
            setForm(emptyForm());
          }}
        >
          Add expense
        </button>
      </header>

      <div className="flex flex-wrap items-end gap-3 card p-3">
        <div className="space-y-1">
          <label className="block text-xs font-medium text-gray-600" htmlFor="expense-month">
            Month
          </label>
          <input
            id="expense-month"
            type="month"
            className="input text-sm"
            value={month}
            onChange={(e) => setMonth(e.currentTarget.value)}
          />
        </div>
        <div className="space-y-1">
          <label className="block text-xs font-medium text-gray-600" htmlFor="expense-category-filter">
            Category
          </label>
          <select
            id="expense-category-filter"
            className="input text-sm"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.currentTarget.value)}
          >
            <option value="">All categories</option>
            {suggestions.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && !form && (
        <p role="alert" className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="overflow-x-auto card">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-gray-200 bg-gray-50 text-gray-600">
            <tr>
              <th className="px-3 py-2">Date</th>
              <th className="px-3 py-2">Category</th>
              <th className="px-3 py-2 text-right">Amount</th>
              <th className="px-3 py-2">Payment</th>
              <th className="px-3 py-2">Note</th>
              <th className="px-3 py-2" />
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td className="px-3 py-4 text-gray-500" colSpan={6}>
                  Loading…
                </td>
              </tr>
            )}
            {!loading && rows.length === 0 && (
              <tr>
                <td className="px-3 py-4 text-gray-500" colSpan={6}>
                  No expenses this month.
                </td>
              </tr>
            )}
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-gray-100 last:border-0">
                <td className="px-3 py-2">{row.date}</td>
                <td className="px-3 py-2 font-medium">{row.category}</td>
                <td className="px-3 py-2 text-right">{formatRupees(row.amountPaise)}</td>
                <td className="px-3 py-2 text-gray-600">{row.paymentMode ?? "—"}</td>
                <td className="px-3 py-2 text-gray-600">{row.note ?? "—"}</td>
                <td className="px-3 py-2 text-right whitespace-nowrap">
                  <button
                    type="button"
                    className="mr-2 text-sm underline"
                    onClick={() => {
                      setError(null);
                      setForm({
                        id: row.id,
                        category: row.category,
                        amount: String(row.amountPaise / 100),
                        date: row.date,
                        paymentMode: row.paymentMode ?? "Cash",
                        note: row.note ?? "",
                      });
                    }}
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    className="text-sm text-red-700 underline"
                    onClick={() => setDeleting(row)}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="border-t border-gray-200 bg-gray-50">
            <tr>
              <td className="px-3 py-2 font-medium" colSpan={2}>
                Month total
              </td>
              <td className="px-3 py-2 text-right font-semibold">{formatRupees(totalPaise)}</td>
              <td colSpan={3} />
            </tr>
          </tfoot>
        </table>
      </div>

      {form && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="expense-form-title"
          className="fixed inset-0 flex items-center justify-center bg-black/40 p-4"
        >
          <form className="w-full max-w-md space-y-3 rounded bg-white p-5 shadow-lg" onSubmit={save}>
            <h2 id="expense-form-title" className="text-lg font-semibold">
              {form.id === null ? "Add expense" : "Edit expense"}
            </h2>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="label" htmlFor="expense-category">
                  Category
                </label>
                <input
                  id="expense-category"
                  list="expense-category-options"
                  className="input w-full"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.currentTarget.value })}
                />
                <datalist id="expense-category-options">
                  {suggestions.map((name) => (
                    <option key={name} value={name} />
                  ))}
                </datalist>
              </div>

              <div className="space-y-1">
                <label className="label" htmlFor="expense-amount">
                  Amount (₹)
                </label>
                <input
                  id="expense-amount"
                  type="number"
                  step="any"
                  className="input w-full"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.currentTarget.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="label" htmlFor="expense-date">
                  Date
                </label>
                <input
                  id="expense-date"
                  type="date"
                  className="input w-full"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.currentTarget.value })}
                />
              </div>

              <div className="space-y-1">
                <label className="label" htmlFor="expense-payment">
                  Payment mode
                </label>
                <select
                  id="expense-payment"
                  className="input w-full"
                  value={form.paymentMode}
                  onChange={(e) => setForm({ ...form, paymentMode: e.currentTarget.value })}
                >
                  {PAYMENT_MODES.map((mode) => (
                    <option key={mode} value={mode}>
                      {mode}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-1">
              <label className="label" htmlFor="expense-note">
                Note (optional)
              </label>
              <input
                id="expense-note"
                className="input w-full"
                value={form.note}
                onChange={(e) => setForm({ ...form, note: e.currentTarget.value })}
              />
            </div>

            {error && (
              <p role="alert" className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            )}

            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="btn-ghost"
                onClick={() => setForm(null)}
                disabled={busy}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn-primary"
                disabled={busy}
              >
                Save
              </button>
            </div>
          </form>
        </div>
      )}

      {deleting && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-expense-title"
          className="fixed inset-0 flex items-center justify-center bg-black/40 p-4"
        >
          <div className="w-full max-w-sm space-y-4 rounded bg-white p-5 shadow-lg">
            <h2 id="delete-expense-title" className="text-lg font-semibold">
              Delete this expense?
            </h2>
            <p className="text-sm text-gray-600">
              {deleting.category} · {formatRupees(deleting.amountPaise)} on {deleting.date}
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="btn-ghost"
                onClick={() => setDeleting(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rounded bg-red-600 px-3 py-1 text-sm font-medium text-white"
                onClick={confirmDelete}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
