import { Fragment, useEffect, useState, type FormEvent, type ReactNode } from "react";
import {
  api,
  money,
  qty,
  type ActivityRow,
  type BatchLedger,
  type BillDetail,
  type BillRow,
  type Customer,
  type DealProfit,
  type FinYearReport,
  type Item,
  type Member,
  type UsageRow,
  type User,
} from "./api";
import { buildBillHtml } from "../../src/lib/printBill";
import type { ShopDetails } from "../../src/db/settings";
import ThemeToggle from "./ThemeToggle";
import { watchSystemTheme } from "./theme";
import EmptyState from "./components/EmptyState";
import ItemPicker from "./components/ItemPicker";
import CustomerPicker from "./components/CustomerPicker";
import ItemThumb from "./components/ItemThumb";
import SalesChart from "./components/SalesChart";
import {
  IconActivity,
  IconBill,
  IconClose,
  IconCoffee as IconCoffeeNav,
  IconDashboard,
  IconExpenses,
  IconImage,
  IconInvestments,
  IconInvoice,
  IconItems,
  IconMenu,
  IconPlus,
  IconPurchases,
  IconReports,
  IconSettings,
  IconSignOut,
  IconStock,
  IconTeam,
} from "./components/icons";

type View = "dashboard" | "reports" | "customers" | "investments" | "bills" | "billing" | "items" | "purchases" | "stock" | "expenses" | "activity" | "team" | "settings";

function IconEye() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function IconEdit() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}

function IconTrash() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M19 6l-1 14H6L5 6" />
    </svg>
  );
}

const CHART_COLORS = [
  "var(--c-chart-1)",
  "var(--c-chart-2)",
  "var(--c-chart-3)",
  "var(--c-chart-4)",
  "var(--c-chart-5)",
  "var(--c-chart-6)",
];

/** "1h 5m" — how long a member was active. */
function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return "0s";
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const rest = seconds % 60;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${rest}s`;
  return `${rest}s`;
}

function Donut({ items }: { items: { label: string; value: number }[] }) {  const total = items.reduce((sum, item) => sum + item.value, 0) || 1;
  let acc = 0;
  const stops = items
    .map((item, index) => {
      const start = (acc / total) * 100;
      acc += item.value;
      return `${CHART_COLORS[index % CHART_COLORS.length]} ${start}% ${(acc / total) * 100}%`;
    })
    .join(", ");
  return (
    <div className="flex flex-wrap items-center gap-5">
      <div className="relative size-28 shrink-0 rounded-full" style={{ background: `conic-gradient(${stops})` }}>
        <div className="absolute inset-5 rounded-full bg-surface" />
      </div>
      <ul className="space-y-1 text-sm">
        {items.map((item, index) => (
          <li key={item.label} className="flex items-center gap-2">
            <span className="size-2.5 rounded-sm" style={{ background: CHART_COLORS[index % CHART_COLORS.length] }} />
            <span>{item.label}</span>
            <span className="text-muted">{money(item.value)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function App() {
  const [checking, setChecking] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [view, setView] = useState<View>("bills");
  const [bills, setBills] = useState<BillRow[]>([]);
  const [items, setItems] = useState<Item[]>([]);
  const [activity, setActivity] = useState<ActivityRow[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [memberName, setMemberName] = useState("");
  const [memberPhone, setMemberPhone] = useState("");
  const [memberPassword, setMemberPassword] = useState("");
  const [teamStatus, setTeamStatus] = useState<string | null>(null);
  const [resetTarget, setResetTarget] = useState<Member | null>(null);
  const [resetPassword, setResetPassword] = useState("");
  const [approveRole, setApproveRole] = useState<Record<number, "staff" | "owner">>({});
  const [notifyEmails, setNotifyEmails] = useState("");
  const [notifySignup, setNotifySignup] = useState(true);
  const [notifyMember, setNotifyMember] = useState(true);
  const [notifyBill, setNotifyBill] = useState(true);
  const [emailConfigured, setEmailConfigured] = useState(false);
  const [notifyStatus, setNotifyStatus] = useState<string | null>(null);
  const [resendKey, setResendKey] = useState("");
  const [itemForm, setItemForm] = useState<{ id: number | null; name: string; unit: string; category: string; minStock: string; imageUrl: string } | null>(null);
  const [itemsMsg, setItemsMsg] = useState<string | null>(null);
  const [billCustomer, setBillCustomer] = useState({ name: "", phone: "", email: "", gstin: "" });
  const [billDate, setBillDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [billMode, setBillMode] = useState("Cash");
  const [billGst, setBillGst] = useState("500");
  const [billDiscount, setBillDiscount] = useState("");
  const [billSaleExpenses, setBillSaleExpenses] = useState("");
  const [draft, setDraft] = useState({ itemId: "" as number | "", qty: "", rate: "", hsn: "" });
  const [billLines, setBillLines] = useState<{ itemId: number; name: string; unit: string; qtyBase: number; ratePaise: number; hsn: string; totalPaise: number }[]>([]);
  const [billMsg, setBillMsg] = useState<string | null>(null);
  const [lastBillId, setLastBillId] = useState<number | null>(null);
  const [stats, setStats] = useState<{ today_sales: number; month_sales: number; month_profit: number; month_expenses: number; credit_paise: number; credit_bills: number; low_stock: number } | null>(null);
  const [purchasesList, setPurchasesList] = useState<Array<{ id: number; name: string; unit: string; qty_base: number; unit_price_paise: number; total_paise: number; purchase_date: string }>>([]);
  const [expensesList, setExpensesList] = useState<Array<{ id: number; category: string; amountPaise: number; date: string; paymentMode: string | null; paidTo: string | null; note: string | null }>>([]);
  const [purchase, setPurchase] = useState({ itemId: "" as number | "", qty: "", rate: "", supplier: "", expenses: "" });
  const [purchaseMsg, setPurchaseMsg] = useState<string | null>(null);
  const [stock, setStock] = useState({ itemId: "" as number | "", type: "USAGE", qty: "", note: "" });
  const [stockBatches, setStockBatches] = useState<Array<{ id: number; qty_remaining: number; unit_price_paise: number; purchase_date: string }>>([]);
  const [stockMsg, setStockMsg] = useState<string | null>(null);
  const [daily, setDaily] = useState<Array<{ date: string; sales: string; expenses: string }>>([]);
  const [categories, setCategories] = useState<Array<{ category: string; total: string }>>([]);
  const [investments, setInvestments] = useState<Array<{ id: number; investor_name: string; amount_paise: number; invested_on: string; note: string | null }>>([]);
  const [investTotal, setInvestTotal] = useState(0);
  const [investment, setInvestment] = useState({ name: "", amount: "", date: new Date().toISOString().slice(0, 10), note: "" });
  const [investmentMsg, setInvestmentMsg] = useState<string | null>(null);
  const [activityFilter, setActivityFilter] = useState("");
  const [expense, setExpense] = useState({ category: "", amount: "", paidTo: "", note: "", type: "general" });
  const [expenseMsg, setExpenseMsg] = useState<string | null>(null);
  const [shop, setShop] = useState<ShopDetails | null>(null);
  const [bill, setBill] = useState<BillDetail | null>(null);
  const [lotItem, setLotItem] = useState<Item | null>(null);
  const [lotLedger, setLotLedger] = useState<BatchLedger | null>(null);
  const [lotLoading, setLotLoading] = useState(false);
  const [lotError, setLotError] = useState<string | null>(null);
  const [expandedLot, setExpandedLot] = useState<number | null>(null);
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [signupName, setSignupName] = useState("");
  const [signupPhone, setSignupPhone] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupConfirm, setSignupConfirm] = useState("");
  const [signupStatus, setSignupStatus] = useState<string | null>(null);
  const [emailStatus, setEmailStatus] = useState<string | null>(null);
  const [loginPhotoOk, setLoginPhotoOk] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerSearch, setCustomerSearch] = useState("");
  const [customerMsg, setCustomerMsg] = useState<string | null>(null);
  const [pickedCustomer, setPickedCustomer] = useState<Customer | null>(null);
  const [customerForm, setCustomerForm] = useState<{
    id: number | null;
    name: string;
    phone: string;
    email: string;
    gstin: string;
    address: string;
  } | null>(null);
  const [finYears, setFinYears] = useState<string[]>([]);
  const [finYear, setFinYear] = useState("");
  const [report, setReport] = useState<FinYearReport | null>(null);
  const [deals, setDeals] = useState<DealProfit[]>([]);
  const [usage, setUsage] = useState<UsageRow[]>([]);
  const [reportsMsg, setReportsMsg] = useState<string | null>(null);
  const [costingMethod, setCostingMethodState] = useState<"WAC" | "FIFO">("WAC");
  const [costingMsg, setCostingMsg] = useState<string | null>(null);

  useEffect(() => {
    api
      .me()
      .then(({ user }) => setUser(user))
      .catch(() => setUser(null))
      .finally(() => setChecking(false));
  }, []);

  useEffect(() => watchSystemTheme(), []);

  /** Close the mobile drawer when the window grows into the desktop layout. */
  useEffect(() => {
    const wide = window.matchMedia("(min-width: 768px)");
    const close = () => {
      if (wide.matches) setMenuOpen(false);
    };
    wide.addEventListener("change", close);
    return () => wide.removeEventListener("change", close);
  }, []);

  /** The financial years available for the FY selector. */
  useEffect(() => {
    if (!user || view !== "reports") return;
    let cancelled = false;
    api
      .finYears()
      .then((res) => {
        if (cancelled) return;
        setFinYears(res.finYears);
        setFinYear((current) => (current && res.finYears.includes(current) ? current : res.finYears[0] ?? ""));
      })
      .catch((err) => {
        if (!cancelled) setReportsMsg(err instanceof Error ? err.message : String(err));
      });
    return () => {
      cancelled = true;
    };
  }, [user, view]);

  /** Load the financial-year report for the selected FY. */
  useEffect(() => {
    if (!user || view !== "reports" || !finYear) return;
    let cancelled = false;
    (async () => {
      try {
        setReportsMsg(null);
        const [reportRes, dealsRes] = await Promise.all([
          api.finYearReport(finYear),
          api.dealProfits(finYear),
        ]);
        if (cancelled) return;
        setReport(reportRes.report);
        setDeals(dealsRes.deals);
      } catch (err) {
        if (!cancelled) setReportsMsg(err instanceof Error ? err.message : String(err));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user, view, finYear]);

  /**
   * Refresh the activity list whenever the Activity or Dashboard tab is opened —
   * otherwise a colleague's sign-in only appears after a full reload.
   */
  useEffect(() => {
    if (!user || (view !== "activity" && view !== "dashboard")) return;
    let cancelled = false;
    api
      .activity()
      .then((res) => {
        if (!cancelled) setActivity(res.activity);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [user, view]);

  /**
   * The customer master (searchable) — used by the billing picker and the
   * Customers screen. It is reloaded whenever one of those screens opens, so a
   * client saved a moment ago is there straight away.
   */
  useEffect(() => {
    if (!user || (view !== "customers" && view !== "billing")) return;
    let cancelled = false;
    api
      .customers(customerSearch)
      .then((res) => {
        if (!cancelled) setCustomers(res.customers);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [user, view, customerSearch]);

  /** The costing method in force (WAC by default). */  useEffect(() => {
    if (!user || user.role !== "owner" || view !== "settings") return;
    let cancelled = false;
    api
      .costingMethod()
      .then((res) => {
        if (!cancelled) setCostingMethodState(res.method);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [user, view]);

  /** Owner-only usage metrics (sessions, active time, last login). */
  useEffect(() => {
    if (!user || user.role !== "owner" || view !== "team") return;
    let cancelled = false;
    api
      .usage()
      .then((res) => {
        if (!cancelled) setUsage(res.usage);
      })
      .catch(() => {
        if (!cancelled) setUsage([]);
      });
    return () => {
      cancelled = true;
    };
  }, [user, view]);

  function addBillLine() {
    const item = items.find((i) => i.id === draft.itemId);
    if (!item) return;
    const qty = Number(draft.qty);
    const rate = Math.round(Number(draft.rate) * 100);
    if (!(qty > 0) || !(rate >= 0)) return;
    const factor = item.unit === "kg" || item.unit === "l" ? 1000 : 1;
    const qtyBase = Math.round(qty * factor);
    setBillLines([...billLines, { itemId: item.id, name: item.name, unit: item.unit, qtyBase, ratePaise: rate, hsn: draft.hsn.trim(), totalPaise: Math.round((qtyBase * rate) / factor) }]);
    setDraft({ itemId: "", qty: "", rate: "", hsn: "" });
  }

  const billSubtotal = billLines.reduce((sum, l) => sum + l.totalPaise, 0);
  const billDiscountPaise = Math.round(Number(billDiscount || "0") * 100);
  const billTaxable = Math.max(0, billSubtotal - billDiscountPaise);
  const billGstPaise = Math.round((billTaxable * Number(billGst || "0")) / 10000);
  const billTotal = billTaxable + billGstPaise;

  async function saveBill() {
    setBillMsg(null);
    if (billLines.length === 0) {
      setBillMsg("Add at least one item");
      return;
    }
    if (billMode === "Credit" && !billCustomer.name.trim()) {
      setBillMsg("Customer name is required for a credit bill");
      return;
    }
    try {
      let customerId: number | undefined;
      if (billCustomer.name.trim()) {
        customerId = (await api.createCustomer(billCustomer)).customer.id;
      }
      const res = await api.createBill({
        customerId,
        date: billDate,
        paymentMode: billMode,
        discountPaise: billDiscountPaise,
        saleExpensesPaise: Math.round(Number(billSaleExpenses || "0") * 100),
        gstPaise: billGstPaise,
        gstRateBp: Number(billGst),
        lines: billLines.map((l) => ({ itemId: l.itemId, qtyBase: l.qtyBase, unitPricePaise: l.ratePaise, hsnCode: l.hsn || undefined })),
      });
      setBillMsg(`Bill ${res.bill.billNo} created — ${money(res.bill.totalPaise)}`);
      setLastBillId(res.bill.saleId);
      setBillLines([]);
      setBillCustomer({ name: "", phone: "", email: "", gstin: "" });
      setBillDiscount("");
      setBillSaleExpenses("");
      setPickedCustomer(null);
      setCustomers((await api.customers(customerSearch)).customers);
      setBills((await api.bills()).bills);
      setItems((await api.items()).items);
    } catch (err) {
      setBillMsg(err instanceof Error ? err.message : String(err));
    }
  }

  async function saveItem() {
    if (!itemForm) return;
    setItemsMsg(null);
    try {
      const body = {
        name: itemForm.name,
        unit: itemForm.unit,
        category: itemForm.category,
        minStockBase: 0,
        imageUrl: itemForm.imageUrl.trim(),
      };
      if (itemForm.id === null) await api.createItem(body);
      else await api.updateItem(itemForm.id, body);
      setItemForm(null);
      setItems((await api.items()).items);
      setItemsMsg("Saved");
    } catch (err) {
      setItemsMsg(err instanceof Error ? err.message : String(err));
    }
  }

  const factorOf = (unit: string) => (unit === "kg" || unit === "l" ? 1000 : 1);
  const todayIso = () => new Date().toISOString().slice(0, 10);

  async function addPurchaseNow() {
    const item = items.find((i) => i.id === purchase.itemId);
    if (!item) return;
    setPurchaseMsg(null);
    try {
      await api.addPurchase({
        itemId: item.id,
        qty: Number(purchase.qty),
        unitPricePaise: Math.round(Number(purchase.rate) * 100),
        expensesPaise: Math.round(Number(purchase.expenses || "0") * 100),
        date: todayIso(),
        supplierName: purchase.supplier,
        paymentMode: "Cash",
      });
      setPurchaseMsg("Purchase saved");
      setPurchase({ itemId: "", qty: "", rate: "", supplier: "", expenses: "" });
      setItems((await api.items()).items);
      setPurchasesList((await api.purchases()).purchases);
      setStats((await api.stats()).stats);
    } catch (err) {
      setPurchaseMsg(err instanceof Error ? err.message : String(err));
    }
  }

  async function pickStockItem(id: number | "") {
    setStock({ ...stock, itemId: id });
    setStockMsg(null);
    if (id === "") return setStockBatches([]);
    setStockBatches((await api.batches(id)).batches);
  }

  async function openLots(item: Item) {
    setLotItem(item);
    setLotLedger(null);
    setLotError(null);
    setExpandedLot(null);
    setLotLoading(true);
    try {
      const { ledger } = await api.batchLedger(item.id);
      setLotLedger(ledger);
    } catch (err) {
      setLotError(err instanceof Error ? err.message : String(err));
    } finally {
      setLotLoading(false);
    }
  }

  async function saveStockNow() {
    const item = items.find((i) => i.id === stock.itemId);
    if (!item) return;
    setStockMsg(null);
    try {
      const base = Math.round(Number(stock.qty) * factorOf(item.unit));
      await api.saveStock({
        itemId: item.id,
        type: stock.type,
        qty: stock.type === "STOCK_CHECK" ? null : base,
        enteredLeft: stock.type === "STOCK_CHECK" ? base : null,
        date: todayIso(),
        note: stock.note,
      });
      setStockMsg("Stock entry saved");
      setStock({ itemId: "", type: "USAGE", qty: "", note: "" });
      setStockBatches([]);
      setItems((await api.items()).items);
      setStats((await api.stats()).stats);
    } catch (err) {
      setStockMsg(err instanceof Error ? err.message : String(err));
    }
  }

  async function addInvestmentNow() {
    setInvestmentMsg(null);
    try {
      await api.addInvestment({
        investorName: investment.name,
        amountPaise: Math.round(Number(investment.amount) * 100),
        date: investment.date,
        note: investment.note,
      });
      setInvestmentMsg("Investment saved");
      setInvestment({ name: "", amount: "", date: new Date().toISOString().slice(0, 10), note: "" });
      const r = await api.investments();
      setInvestments(r.investments);
      setInvestTotal(r.totalPaise);
    } catch (err) {
      setInvestmentMsg(err instanceof Error ? err.message : String(err));
    }
  }

  async function removeInvestment(id: number) {
    await api.deleteInvestment(id);
    const r = await api.investments();
    setInvestments(r.investments);
    setInvestTotal(r.totalPaise);
  }

  /** Save a customer into the master (new or edited). */
  async function saveCustomerNow() {
    if (!customerForm) return;
    setCustomerMsg(null);
    const body = {
      name: customerForm.name.trim(),
      phone: customerForm.phone.trim(),
      email: customerForm.email.trim(),
      gstin: customerForm.gstin.trim(),
      address: customerForm.address.trim(),
    };
    try {
      if (customerForm.id === null) {
        await api.saveCustomer(body);
        setCustomerMsg(`${body.name} saved to the customer master`);
      } else {
        await api.updateCustomer(customerForm.id, body);
        setCustomerMsg(`${body.name} updated`);
      }
      setCustomerForm(null);
      setCustomers((await api.customers(customerSearch)).customers);
    } catch (err) {
      setCustomerMsg(err instanceof Error ? err.message : String(err));
    }
  }

  async function addExpenseNow() {
    setExpenseMsg(null);
    try {
      await api.addExpense({
        category: expense.category,
        expenseType: expense.type,
        amountPaise: Math.round(Number(expense.amount) * 100),
        date: todayIso(),
        paymentMode: "Cash",
        paidTo: expense.paidTo,
        note: expense.note,
      });
      setExpenseMsg("Expense saved");
      setExpense({ category: "", amount: "", paidTo: "", note: "", type: "general" });
      setExpensesList((await api.expenses()).expenses);
      setStats((await api.stats()).stats);
    } catch (err) {
      setExpenseMsg(err instanceof Error ? err.message : String(err));
    }
  }

  async function loadNotify() {
    const cfg = await api.notifySettings();
    setNotifyEmails(cfg.emails.join(", "));
    setNotifySignup(cfg.signup);
    setNotifyMember(cfg.member);
    setNotifyBill(cfg.bill);
    setEmailConfigured(cfg.emailConfigured);
  }

  async function loadMembers() {
    setMembers((await api.users()).users);
  }

  useEffect(() => {
    if (!user) return;
    if (user.role === "owner") {
      void loadMembers().catch(() => setMembers([]));
      void loadNotify().catch(() => setNotifyStatus("Could not load notification settings"));
    }
    void Promise.all([api.statsDaily().then((r) => setDaily(r.daily)), api.expenseCategories().then((r) => setCategories(r.categories)), ...(user.role === "owner" ? [api.investments().then((r) => { setInvestments(r.investments); setInvestTotal(r.totalPaise); })] : []), api.stats().then((r) => setStats(r.stats)), api.purchases().then((r) => setPurchasesList(r.purchases)), api.expenses().then((r) => setExpensesList(r.expenses)), api.bills().then((r) => setBills(r.bills)), api.items().then((r) => setItems(r.items)), api.activity().then((r) => setActivity(r.activity)), api.shop().then((r) => setShop(r.shop as unknown as ShopDetails))]).catch((err) =>
      setError(err instanceof Error ? err.message : String(err)),
    );
  }, [user]);

  async function requestAccount(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSignupStatus(null);
    if (signupPassword !== signupConfirm) {
      setError("Passwords do not match");
      return;
    }
    setBusy(true);
    try {
      await api.signup(signupName, signupPhone, signupPassword);
      setSignupStatus("Request sent — the owner must approve this account before you can sign in.");
      setSignupName("");
      setSignupPhone("");
      setSignupPassword("");
      setSignupConfirm("");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

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

  async function saveNotify() {
    setNotifyStatus(null);
    try {
      await api.saveNotifySettings({
        emails: notifyEmails,
        signup: notifySignup,
        member: notifyMember,
        bill: notifyBill,
        ...(resendKey.trim() ? { resendApiKey: resendKey.trim() } : {}),
      });
      setResendKey("");
      await loadNotify();
      setNotifyStatus("Notification settings saved");
    } catch (err) {
      setNotifyStatus(err instanceof Error ? err.message : String(err));
    }
  }

  async function testNotify() {
    setNotifyStatus("Sending test…");
    try {
      const r = await api.testNotify();
      setNotifyStatus(`Test email sent to ${(r.to ?? []).join(", ")}`);
    } catch (err) {
      setNotifyStatus(err instanceof Error ? err.message : String(err));
    }
  }

  async function addMember() {
    setTeamStatus(null);
    try {
      await api.addUser(memberName, memberPhone, memberPassword);
      setTeamStatus("Member added");
      setMemberName("");
      setMemberPhone("");
      setMemberPassword("");
      await loadMembers();
    } catch (err) {
      setTeamStatus(err instanceof Error ? err.message : String(err));
    }
  }

  async function saveResetPassword() {
    if (!resetTarget) return;
    try {
      await api.resetUserPassword(resetTarget.id, resetPassword);
      setTeamStatus(`Password reset for ${resetTarget.name}`);
      setResetTarget(null);
      setResetPassword("");
    } catch (err) {
      setTeamStatus(err instanceof Error ? err.message : String(err));
    }
  }

  async function toggleMember(member: Member) {
    try {
      await api.setUserActive(member.id, !member.active);
      setTeamStatus(`${member.name} ${member.active ? "disabled" : "enabled"}`);
      await loadMembers();
    } catch (err) {
      setTeamStatus(err instanceof Error ? err.message : String(err));
    }
  }

  async function emailBill(id: number) {
    setEmailStatus("Sending…");
    try {
      const result = await api.emailBill(id);
      setEmailStatus(`Emailed to ${result.to}`);
    } catch (err) {
      setEmailStatus(err instanceof Error ? err.message : String(err));
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
    return <main className="grid min-h-screen place-items-center text-sm text-muted">Loading…</main>;
  }

  if (!user) {
    return (
      <main className="grid min-h-screen md:grid-cols-2">
        {/* Left: the café photo with a brown gradient overlay (desktop only) */}
        <div className="relative hidden overflow-hidden bg-[#4a3325] md:block">
          {loginPhotoOk ? (
            <img
              src="/assets/login-bg.webp"
              alt=""
              loading="eager"
              decoding="async"
              onError={() => setLoginPhotoOk(false)}
              className="absolute inset-0 size-full object-cover"
            />
          ) : null}
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(160deg, rgba(58,40,28,0.92) 0%, rgba(74,51,37,0.78) 45%, rgba(28,22,18,0.94) 100%)",
            }}
          />
          <div className="relative flex h-full flex-col justify-between p-10 text-[#F7F1E8]">
            <div className="flex items-center gap-3">
              <span className="grid size-11 place-items-center rounded-xl bg-[#F7F1E8]/15 text-[#F7F1E8]">
                <IconCoffeeNav size={22} />
              </span>
              <p className="text-[12px] font-semibold uppercase leading-[1.4] tracking-[0.14em]">
                SREE DURGA HARIHARA
                <br />
                ENTERPRISES
              </p>
            </div>
            <div>
              <p className="font-display text-3xl leading-tight text-[#F7F1E8]">Billing, stock &amp; accounts</p>
              <p className="mt-2 max-w-sm text-sm text-[#E0D2C4]">
                Every bill, purchase and expense in one place — with live profit and turnover for the
                financial year.
              </p>
            </div>
          </div>
        </div>

        {/* Right: the form */}
        <div className="flex items-center justify-center bg-bg p-6">
          <div className="card w-full max-w-sm p-6">
            <div className="mb-6">
              {/* On mobile the logo sits above the form (the photo panel is hidden). */}
              <span className="mb-3 grid size-10 place-items-center rounded-xl bg-primary text-on-primary md:hidden">
                <IconCoffeeNav />
              </span>
              <div className="flex items-start justify-between gap-3">
                <h1 className="text-[13px] font-semibold uppercase leading-snug tracking-wide">
                  SREE DURGA HARIHARA ENTERPRISES
                </h1>
                <ThemeToggle />
              </div>
              <p className="mt-1 text-sm text-muted">Sign in to the web edition.</p>
            </div>
          {authMode === "login" ? (
            <form className="space-y-4" onSubmit={signIn}>
              <div>
                <label className="label" htmlFor="phone">Phone number</label>
                <input id="phone" className="input" value={phone} onChange={(e) => setPhone(e.currentTarget.value)} autoFocus />
              </div>
              <div>
                <label className="label" htmlFor="password">Password</label>
                <input id="password" type="password" className="input" value={password} onChange={(e) => setPassword(e.currentTarget.value)} />
              </div>
              {error && <p role="alert" className="rounded bg-error-soft px-3 py-2 text-sm text-error-ink">{error}</p>}
              <button className="btn btn-primary w-full" type="submit" disabled={busy}>Sign in</button>
              <button type="button" className="w-full text-sm text-muted underline" onClick={() => { setAuthMode("signup"); setError(null); setSignupStatus(null); }}>
                Create account
              </button>
            </form>
          ) : (
            <form className="space-y-4" onSubmit={requestAccount}>
              <div>
                <label className="label" htmlFor="signup-name">Your name</label>
                <input id="signup-name" className="input" value={signupName} onChange={(e) => setSignupName(e.currentTarget.value)} autoFocus />
              </div>
              <div>
                <label className="label" htmlFor="signup-phone">Phone number</label>
                <input id="signup-phone" className="input" value={signupPhone} onChange={(e) => setSignupPhone(e.currentTarget.value)} />
              </div>
              <div>
                <label className="label" htmlFor="signup-password">Password (6+)</label>
                <input id="signup-password" type="password" className="input" value={signupPassword} onChange={(e) => setSignupPassword(e.currentTarget.value)} />
              </div>
              <div>
                <label className="label" htmlFor="signup-confirm">Confirm password</label>
                <input id="signup-confirm" type="password" className="input" value={signupConfirm} onChange={(e) => setSignupConfirm(e.currentTarget.value)} />
              </div>
              {error && <p role="alert" className="rounded bg-error-soft px-3 py-2 text-sm text-error-ink">{error}</p>}
              {signupStatus && <p role="status" className="rounded bg-success-soft px-3 py-2 text-sm text-success-ink">{signupStatus}</p>}
              <button className="btn btn-primary w-full" type="submit" disabled={busy}>Request account</button>
              <button type="button" className="w-full text-sm text-muted underline" onClick={() => { setAuthMode("login"); setError(null); }}>
                Back to sign in
              </button>
            </form>
          )}
          </div>
        </div>
      </main>
    );
  }

  const navGroups: { heading: string | null; links: { key: View; label: string; icon: ReactNode }[] }[] = [
    {
      heading: null,
      links: [{ key: "dashboard", label: "Dashboard", icon: <IconDashboard size={16} /> }],
    },
    {
      heading: "Sales",
      links: [
        { key: "billing", label: "New Bill", icon: <IconBill size={16} /> },
        { key: "bills", label: "Invoices", icon: <IconInvoice size={16} /> },
      ],
    },
    {
      heading: "Inventory",
      links: [
        { key: "items", label: "Items", icon: <IconItems size={16} /> },
        { key: "purchases", label: "Purchases", icon: <IconPurchases size={16} /> },
        { key: "stock", label: "Stock Check", icon: <IconStock size={16} /> },
      ],
    },
    {
      heading: "Contacts",
      links: [{ key: "customers", label: "Customers", icon: <IconTeam size={16} /> }],
    },
    {
      heading: "Money",
      links: [
        { key: "expenses", label: "Expenses", icon: <IconExpenses size={16} /> },
        ...(user.role === "owner"
          ? [{ key: "investments" as View, label: "Investments", icon: <IconInvestments size={16} /> }]
          : []),
        { key: "reports", label: "Reports", icon: <IconReports size={16} /> },
      ],
    },
    // ADMIN is owner-only — staff never see it.
    ...(user.role === "owner"
      ? [
          {
            heading: "Admin",
            links: [
              { key: "activity" as View, label: "Activity", icon: <IconActivity size={16} /> },
              { key: "team" as View, label: "Team", icon: <IconTeam size={16} /> },
              { key: "settings" as View, label: "Settings", icon: <IconSettings size={16} /> },
            ],
          },
        ]
      : []),
  ];

  return (
    <div className="min-h-screen md:flex">
      {/* Desktop: the rail is sticky, so it stays put while the page scrolls */}
      <aside className="nav-texture sticky top-0 hidden h-screen w-60 shrink-0 flex-col overflow-y-auto bg-nav px-3 py-5 text-nav-text md:flex">
        <div className="relative z-10 mb-6 flex items-start gap-3 px-2">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-nav-text/15 text-nav-text">
            <IconCoffeeNav />
          </span>
          <p className="min-w-0 flex-1 text-[10px] font-semibold uppercase leading-[1.35] tracking-[0.12em] text-nav-text">
            SREE DURGA HARIHARA
            <br />
            ENTERPRISES
          </p>
        </div>
        <nav className="relative z-10 flex flex-col gap-4">
          {navGroups.map((group, groupIndex) => (
            <div key={group.heading ?? `group-${groupIndex}`}>
              {group.heading ? (
                <p className="mb-1 px-3 text-[9.5px] font-semibold uppercase tracking-[0.16em] text-nav-muted/80">
                  {group.heading}
                </p>
              ) : null}
              <div className="flex flex-col gap-0.5">
                {group.links.map((link) => (
                  <button
                    key={link.key}
                    className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm ${
                      view === link.key
                        ? "bg-nav-active font-medium text-nav-text"
                        : "text-nav-muted hover:bg-nav-hover hover:text-nav-text"
                    }`}
                    onClick={() => { setView(link.key); setBill(null); }}
                  >
                    <span className="shrink-0 opacity-90">{link.icon}</span>
                    {link.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </nav>
        <div className="relative z-10 mt-auto space-y-3 px-2 pt-6 text-[11px]">
          <ThemeToggle onDark />
          <div className="space-y-1">
            <p className="text-nav-muted">{user.name} · {user.role}</p>
            <button className="underline text-nav-muted" onClick={() => void api.logout().then(() => setUser(null))}>Sign out</button>
          </div>
        </div>
      </aside>

      {/* Mobile: icon-only header + a side drawer that opens when the menu is tapped */}
      <div className="md:hidden">
        <header className="sticky top-0 z-30 flex items-center justify-between gap-2 bg-nav px-3 py-2 text-nav-text">
          <div className="flex min-w-0 items-center gap-2">
            <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-nav-text/15 text-nav-text">
              <IconCoffeeNav />
            </span>
            <p className="min-w-0 text-[9px] font-semibold uppercase leading-[1.3] tracking-[0.12em]">
              SREE DURGA HARIHARA
              <br />
              ENTERPRISES
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <ThemeToggle onDark />
            <button
              type="button"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              aria-expanded={menuOpen}
              className="grid size-8 place-items-center rounded-lg text-nav-text hover:bg-nav-hover"
              onClick={() => setMenuOpen((open) => !open)}
            >
              {menuOpen ? <IconClose size={18} /> : <IconMenu size={18} />}
            </button>
            <button
              type="button"
              aria-label="Sign out"
              className="grid size-8 place-items-center rounded-lg text-nav-text hover:bg-nav-hover"
              onClick={() => void api.logout().then(() => setUser(null))}
            >
              <IconSignOut size={17} />
            </button>
          </div>
        </header>

        {menuOpen ? (
          <>
            <button
              type="button"
              aria-label="Close menu"
              className="fixed inset-0 z-40 cursor-default bg-[#1C1612]/50"
              onClick={() => setMenuOpen(false)}
            />
            <aside className="nav-texture fixed inset-y-0 left-0 z-50 flex w-64 flex-col overflow-y-auto bg-nav px-3 py-4 text-nav-text">
              <div className="relative z-10 mb-5 flex items-start gap-3 px-2">
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-nav-text/15 text-nav-text">
                  <IconCoffeeNav />
                </span>
                <p className="min-w-0 flex-1 text-[10px] font-semibold uppercase leading-[1.35] tracking-[0.12em]">
                  SREE DURGA HARIHARA
                  <br />
                  ENTERPRISES
                </p>
              </div>
              <nav className="relative z-10 flex flex-col gap-4">
                {navGroups.map((group, groupIndex) => (
                  <div key={group.heading ?? `drawer-${groupIndex}`}>
                    {group.heading ? (
                      <p className="mb-1 px-3 text-[9.5px] font-semibold uppercase tracking-[0.16em] text-nav-muted/80">
                        {group.heading}
                      </p>
                    ) : null}
                    <div className="flex flex-col gap-0.5">
                      {group.links.map((link) => (
                        <button
                          key={link.key}
                          className={`flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm ${
                            view === link.key
                              ? "bg-nav-active font-medium text-nav-text"
                              : "text-nav-muted hover:bg-nav-hover hover:text-nav-text"
                          }`}
                          onClick={() => {
                            setView(link.key);
                            setBill(null);
                            setMenuOpen(false);
                          }}
                        >
                          <span className="shrink-0 opacity-90">{link.icon}</span>
                          {link.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </nav>
              <div className="relative z-10 mt-auto space-y-2 px-2 pt-6 text-[11px]">
                <p className="text-nav-muted">{user.name} · {user.role}</p>
                <button
                  className="flex items-center gap-1.5 text-nav-muted underline"
                  onClick={() => void api.logout().then(() => setUser(null))}
                >
                  <IconSignOut size={14} /> Sign out
                </button>
              </div>
            </aside>
          </>
        ) : null}
      </div>

      <main className="min-w-0 flex-1 px-4 py-6 md:px-8 md:py-8">
        {error && <p role="alert" className="mb-4 rounded bg-error-soft px-3 py-2 text-sm text-error-ink">{error}</p>}

        {view === "dashboard" && (
          <section className="space-y-4">
            <h1 className="text-xl font-semibold tracking-tight md:text-2xl">Dashboard</h1>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[
                ["Today's sales", money(stats?.today_sales ?? 0), ""],
                ["This month", money(stats?.month_sales ?? 0), ""],
                ["Month profit", money(stats?.month_profit ?? 0), ""],
                ["Month expenses", money(stats?.month_expenses ?? 0), ""],
                ["Credit given", money(stats?.credit_paise ?? 0), `${stats?.credit_bills ?? 0} unpaid bills`],
                ["Low stock items", String(stats?.low_stock ?? 0), ""],
              ].map(([label, value, hint]) => (
                <div key={label} className="card p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">{label}</p>
                  <p className="mt-1 text-2xl font-semibold tracking-tight">{value}</p>
                  {hint ? <p className="mt-0.5 text-[11px] text-muted">{hint}</p> : null}
                </div>
              ))}
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="card p-4">
                <div className="mb-3 flex items-center justify-between">
                  <h2 className="text-sm font-medium">Last 14 days</h2>
                  <div className="flex items-center gap-3 text-xs text-muted">
                    <span className="flex items-center gap-1"><span className="size-2.5 rounded-sm bg-chart-1" /> Sales</span>
                    <span className="flex items-center gap-1"><span className="size-2.5 rounded-sm bg-chart-5" /> Expenses</span>
                  </div>
                </div>
                <SalesChart data={daily} />
              </div>
              <div className="card p-4">
                <h2 className="mb-3 text-sm font-medium">Expenses by category (month)</h2>
                {categories.length === 0 ? (
                  <EmptyState
                    compact
                    illustration="expenses"
                    title="No expenses this month"
                    message="Add rent, transport or any other cost to see the split."
                    actionLabel="Add expense"
                    onAction={() => setView("expenses")}
                  />
                ) : (
                  <Donut items={categories.map((c) => ({ label: c.category, value: Number(c.total) }))} />
                )}
              </div>
            </div>
            <div className="card p-4">
              <h2 className="mb-2 text-sm font-medium">Recent activity</h2>
              <ul className="divide-y divide-line text-sm">
                {activity.slice(0, 8).map((row) => (
                  <li key={row.id} className="flex flex-wrap items-baseline justify-between gap-2 py-1.5">
                    <span>{row.summary}</span>
                    <span className="text-xs text-muted">{row.actor}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}

        {view === "reports" && (
          <section className="space-y-4">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <h1 className="text-xl font-semibold tracking-tight md:text-2xl">Profit &amp; turnover</h1>
                <p className="text-sm text-muted">
                  {report ? `Financial year ${report.finYear} · ${report.startDate} to ${report.endDate}` : "Pick a financial year."}
                </p>
              </div>
              <select className="input max-w-44" value={finYear} onChange={(e) => setFinYear(e.currentTarget.value)}>
                {finYears.map((year) => (
                  <option key={year} value={year}>
                    FY {year}
                  </option>
                ))}
              </select>
            </div>
            {reportsMsg && <p role="alert" className="rounded bg-error-soft px-3 py-2 text-sm text-error-ink">{reportsMsg}</p>}
            {report && (
              <>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {[
                    ["Turnover", money(report.turnoverPaise), `${report.salesCount} deals`],
                    ["Total purchases", money(report.totalPurchasesPaise), `stock ${money(report.purchaseValuePaise)} + ${money(report.purchaseExpensesPaise)}`],
                    ["Gross profit", money(report.grossProfitPaise), `after COGS ${money(report.cogsPaise)}`],
                    ["Net profit", money(report.netProfitPaise), `sales ${money(report.saleExpensesPaise)} · general ${money(report.generalExpensesPaise)}`],
                  ].map(([label, value, hint]) => (
                    <div key={label} className="card p-4">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">{label}</p>
                      <p className="mt-1 text-2xl font-semibold tracking-tight">{value}</p>
                      <p className="mt-0.5 text-[11px] text-muted">{hint}</p>
                    </div>
                  ))}
                </div>

                <div className="card overflow-x-auto">
                  <table className="w-full min-w-[560px] text-left text-sm">
                    <thead>
                      <tr>
                        <th className="px-3 py-2">Deal</th>
                        <th className="px-3 py-2">Date</th>
                        <th className="px-3 py-2">Customer</th>
                        <th className="px-3 py-2 text-right">Sale value</th>
                        <th className="px-3 py-2 text-right">COGS</th>
                        <th className="px-3 py-2 text-right">Gross</th>
                        <th className="px-3 py-2 text-right">Sale exp.</th>
                        <th className="px-3 py-2 text-right">Net profit</th>
                        <th className="px-3 py-2 text-right">%</th>
                      </tr>
                    </thead>
                    <tbody>
                      {deals.length === 0 && (
                        <tr>
                          <td className="px-3 py-4 text-muted" colSpan={9}>
                            No deals in this financial year.
                          </td>
                        </tr>
                      )}
                      {deals.map((deal) => (
                        <tr key={deal.saleId} className="border-t border-line">
                          <td className="px-3 py-2 font-medium">{deal.billNo}</td>
                          <td className="px-3 py-2">{deal.date}</td>
                          <td className="px-3 py-2">{deal.customerName ?? "Walk-in"}</td>
                          <td className="px-3 py-2 text-right">{money(deal.saleValuePaise)}</td>
                          <td className="px-3 py-2 text-right">{money(deal.cogsPaise)}</td>
                          <td className="px-3 py-2 text-right">{money(deal.grossProfitPaise)}</td>
                          <td className="px-3 py-2 text-right">{money(deal.saleExpensesPaise)}</td>
                          <td className="px-3 py-2 text-right font-medium">{money(deal.netProfitPaise)}</td>
                          <td className="px-3 py-2 text-right">
                            <span className={`badge ${deal.profitPercent >= 0 ? "badge-ok" : "badge-bad"}`}>{deal.profitPercent}%</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="card overflow-x-auto">
                  <div className="flex items-center justify-between px-4 py-3">
                    <h2 className="text-sm font-medium">Closing stock</h2>
                    <span className="text-sm text-muted">{money(report.closingStockValuePaise)}</span>
                  </div>
                  <table className="w-full min-w-[520px] text-left text-sm">
                    <thead>
                      <tr>
                        <th className="px-3 py-2">Item</th>
                        <th className="px-3 py-2 text-right">Quantity</th>
                        <th className="px-3 py-2 text-right">Avg cost</th>
                        <th className="px-3 py-2 text-right">Value</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.closingStock.filter((row) => row.qtyBase > 0).map((row) => (
                        <tr key={row.itemId} className="border-t border-line">
                          <td className="px-3 py-2 font-medium">{row.name}</td>
                          <td className="px-3 py-2 text-right">{qty(row.qtyBase, row.unit)}</td>
                          <td className="px-3 py-2 text-right">{money(row.avgCostPaise)}</td>
                          <td className="px-3 py-2 text-right">{money(row.valuePaise)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </section>
        )}

        {view === "customers" && (
          <section className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h1 className="text-xl font-semibold tracking-tight md:text-2xl">Customers</h1>
                <p className="text-sm text-muted">Saved client details — picked by name when you bill.</p>
              </div>
              <div className="flex items-center gap-2">
                <input
                  className="input max-w-52"
                  placeholder="Search name, phone, GSTIN…"
                  value={customerSearch}
                  onChange={(e) => setCustomerSearch(e.currentTarget.value)}
                />
                <button
                  className="btn btn-primary whitespace-nowrap"
                  onClick={() => setCustomerForm({ id: null, name: "", phone: "", email: "", gstin: "", address: "" })}
                >
                  <span className="flex items-center gap-1.5"><IconPlus size={15} /> Add customer</span>
                </button>
              </div>
            </div>
            {customerForm && (
              <div className="card max-w-3xl space-y-3 p-4">
                <h2 className="text-sm font-medium">{customerForm.id === null ? "Add customer" : "Edit customer"}</h2>
                <div className="grid gap-2 sm:grid-cols-2">
                  <input className="input" placeholder="Customer name *" value={customerForm.name} onChange={(e) => setCustomerForm({ ...customerForm, name: e.currentTarget.value })} />
                  <input className="input" placeholder="Phone" value={customerForm.phone} onChange={(e) => setCustomerForm({ ...customerForm, phone: e.currentTarget.value })} />
                  <input className="input" placeholder="Email" value={customerForm.email} onChange={(e) => setCustomerForm({ ...customerForm, email: e.currentTarget.value })} />
                  <input className="input" placeholder="GSTIN" value={customerForm.gstin} onChange={(e) => setCustomerForm({ ...customerForm, gstin: e.currentTarget.value.toUpperCase() })} />
                  <input className="input sm:col-span-2" placeholder="Address" value={customerForm.address} onChange={(e) => setCustomerForm({ ...customerForm, address: e.currentTarget.value })} />
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button className="btn btn-primary" onClick={() => void saveCustomerNow()}>Save</button>
                  <button className="btn-mini" onClick={() => setCustomerForm(null)}>Cancel</button>
                  <span className="text-xs text-muted">
                    Saved clients are matched by phone or GSTIN — saving again updates the same record.
                  </span>
                </div>
              </div>
            )}
            <div className="card overflow-x-auto">
              {customers.length === 0 ? (
                <EmptyState
                  illustration="invoices"
                  title="No customers yet"
                  message="Client details are saved automatically when you bill them."
                  actionLabel="New bill"
                  onAction={() => { setView("billing"); setBill(null); }}
                />
              ) : (
                <table className="w-full min-w-[640px] text-left text-sm">
                  <thead>
                    <tr>
                      <th className="px-3 py-2">Customer</th>
                      <th className="px-3 py-2">Phone</th>
                      <th className="px-3 py-2">GSTIN</th>
                      <th className="px-3 py-2 text-right">Bills</th>
                      <th className="px-3 py-2 text-right">Billed</th>
                      <th className="px-3 py-2 text-right">Credit</th>
                      <th className="px-3 py-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {customers.map((customer) => (
                      <tr key={customer.id} className="border-t border-line">
                        <td className="px-3 py-2 font-medium">
                          <span className="flex items-center gap-2">
                            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-secondary-soft text-[11px] font-semibold text-secondary-ink">
                              {customer.name.trim().charAt(0).toUpperCase()}
                            </span>
                            {customer.name}
                          </span>
                        </td>
                        <td className="px-3 py-2">{customer.phone ?? "—"}</td>
                        <td className="px-3 py-2">{customer.gstin ?? "—"}</td>
                        <td className="px-3 py-2 text-right">{customer.billCount}</td>
                        <td className="px-3 py-2 text-right">{money(customer.billedPaise)}</td>
                        <td className="px-3 py-2 text-right">
                          {customer.creditPaise > 0 ? (
                            <span className="badge badge-warn">{money(customer.creditPaise)}</span>
                          ) : (
                            <span className="text-muted">—</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-right">
                          <span className="flex justify-end gap-2">
                            <button
                              className="btn-mini"
                              onClick={() =>
                                setCustomerForm({
                                  id: customer.id,
                                  name: customer.name,
                                  phone: customer.phone ?? "",
                                  email: customer.email ?? "",
                                  gstin: customer.gstin ?? "",
                                  address: customer.address ?? "",
                                })
                              }
                            >
                              Edit
                            </button>
                            <button
                              className="btn-mini btn-mini-danger"
                              onClick={async () => {
                                if (!window.confirm(`Remove ${customer.name} from the customer master?`)) return;
                                try {
                                  await api.deleteCustomer(customer.id);
                                  setCustomers((await api.customers(customerSearch)).customers);
                                  setCustomerMsg(`${customer.name} removed`);
                                } catch (err) {
                                  setCustomerMsg(err instanceof Error ? err.message : String(err));
                                }
                              }}
                            >
                              Delete
                            </button>
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
            {customerMsg && <p role="status" className="text-sm text-muted">{customerMsg}</p>}
          </section>
        )}

        {view === "purchases" && (
          <section className="space-y-4">
            <h1 className="text-xl font-semibold tracking-tight md:text-2xl">Purchases</h1>
            <div className="card max-w-3xl space-y-3 p-4">
              <div className="grid gap-2 sm:grid-cols-5">
                <select className="input" value={purchase.itemId} onChange={(e) => setPurchase({ ...purchase, itemId: e.currentTarget.value === "" ? "" : Number(e.currentTarget.value) })}>
                  <option value="">Choose item…</option>
                  {items.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
                </select>
                <input className="input" type="number" placeholder="Qty" value={purchase.qty} onChange={(e) => setPurchase({ ...purchase, qty: e.currentTarget.value })} />
                <input className="input" type="number" placeholder="Rate ₹" value={purchase.rate} onChange={(e) => setPurchase({ ...purchase, rate: e.currentTarget.value })} />
                <input className="input" type="number" placeholder="Transport ₹" value={purchase.expenses} onChange={(e) => setPurchase({ ...purchase, expenses: e.currentTarget.value })} />
                <input className="input" placeholder="Supplier" value={purchase.supplier} onChange={(e) => setPurchase({ ...purchase, supplier: e.currentTarget.value })} />
              </div>
              <button className="btn btn-primary" onClick={() => void addPurchaseNow()}>Save purchase</button>
              {purchaseMsg && <p role="status" className="text-sm text-muted">{purchaseMsg}</p>}
            </div>
            <div className="card overflow-x-auto">
              {purchasesList.length === 0 ? (
                <EmptyState
                  illustration="purchases"
                  title="No purchases yet"
                  message="Record what you buy — the weighted-average cost is updated automatically."
                />
              ) : (
                <table className="w-full min-w-[560px] text-left text-sm">
                  <thead><tr><th className="px-3 py-2">Date</th><th className="px-3 py-2">Item</th><th className="px-3 py-2">Qty</th><th className="px-3 py-2 text-right">Total</th></tr></thead>
                  <tbody>{purchasesList.map((p) => (
                    <tr key={p.id} className="border-t border-line">
                      <td className="px-3 py-2">{p.purchase_date}</td>
                      <td className="px-3 py-2 font-medium">{p.name}</td>
                      <td className="px-3 py-2">{qty(p.qty_base, p.unit)}</td>
                      <td className="px-3 py-2 text-right">{money(p.total_paise)}</td>
                    </tr>
                  ))}</tbody>
                </table>
              )}
            </div>
          </section>
        )}

        {view === "stock" && (
          <section className="space-y-4">
            <h1 className="text-xl font-semibold tracking-tight md:text-2xl">Stock Check</h1>
            <div className="card max-w-3xl space-y-3 p-4">
              <div className="grid gap-2 sm:grid-cols-2">
                <select className="input" value={stock.itemId} onChange={(e) => void pickStockItem(e.currentTarget.value === "" ? "" : Number(e.currentTarget.value))}>
                  <option value="">Choose item…</option>
                  {items.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
                </select>
                <select className="input" value={stock.type} onChange={(e) => setStock({ ...stock, type: e.currentTarget.value })}>
                  <option value="USAGE">Used</option>
                  <option value="WASTAGE">Wastage</option>
                  <option value="STOCK_CHECK">Stock left</option>
                </select>
              </div>
              {stock.itemId !== "" && (
                <p className="text-sm text-muted">
                  Current stock: {qty(stockBatches.reduce((sum, b) => sum + b.qty_remaining, 0), items.find((i) => i.id === stock.itemId)?.unit ?? "kg")}
                </p>
              )}
              <div className="grid gap-2 sm:grid-cols-2">
                <input className="input" type="number" placeholder={stock.type === "STOCK_CHECK" ? "Stock left" : "Quantity"} value={stock.qty} onChange={(e) => setStock({ ...stock, qty: e.currentTarget.value })} />
                <input className="input" placeholder="Note (optional)" value={stock.note} onChange={(e) => setStock({ ...stock, note: e.currentTarget.value })} />
              </div>
              <button className="btn btn-primary" onClick={() => void saveStockNow()}>Save entry</button>
              {stockMsg && <p role="status" className="text-sm text-muted">{stockMsg}</p>}
            </div>
          </section>
        )}

        {view === "expenses" && (
          <section className="space-y-4">
            <h1 className="text-xl font-semibold tracking-tight md:text-2xl">Expenses</h1>
            <div className="card max-w-3xl space-y-3 p-4">
              <div className="grid gap-2 sm:grid-cols-5">
                <select className="input" value={expense.type} onChange={(e) => setExpense({ ...expense, type: e.currentTarget.value })}>
                  <option value="general">General</option>
                  <option value="purchase">Purchase</option>
                  <option value="sale">Sale</option>
                </select>
                <input className="input" placeholder="Category" value={expense.category} onChange={(e) => setExpense({ ...expense, category: e.currentTarget.value })} />
                <input className="input" type="number" placeholder="Amount ₹" value={expense.amount} onChange={(e) => setExpense({ ...expense, amount: e.currentTarget.value })} />
                <input className="input" placeholder="Paid to" value={expense.paidTo} onChange={(e) => setExpense({ ...expense, paidTo: e.currentTarget.value })} />
                <input className="input" placeholder="Note" value={expense.note} onChange={(e) => setExpense({ ...expense, note: e.currentTarget.value })} />
              </div>
              <button className="btn btn-primary" onClick={() => void addExpenseNow()}>Add expense</button>
              {expenseMsg && <p role="status" className="text-sm text-muted">{expenseMsg}</p>}
            </div>
            <div className="card overflow-x-auto">
              <table className="w-full min-w-[520px] text-left text-sm">
                <thead><tr><th className="px-3 py-2">Date</th><th className="px-3 py-2">Category</th><th className="px-3 py-2">Paid to</th><th className="px-3 py-2 text-right">Amount</th></tr></thead>
                <tbody>{expensesList.map((x) => (
                  <tr key={x.id} className="border-t border-line">
                    <td className="px-3 py-2">{x.date}</td>
                    <td className="px-3 py-2 font-medium">{x.category}</td>
                    <td className="px-3 py-2">{x.paidTo ?? "—"}</td>
                    <td className="px-3 py-2 text-right">{money(x.amountPaise)}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          </section>
        )}

        {view === "investments" && user.role === "owner" && (
          <section className="space-y-4">
            <h1 className="text-xl font-semibold tracking-tight md:text-2xl">Investments</h1>
            <div className="card p-4">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">Total invested</p>
              <p className="mt-1 text-3xl font-semibold tracking-tight">{money(investTotal)}</p>
            </div>
            <div className="card space-y-3 p-4">
              <div className="grid gap-2 sm:grid-cols-4">
                <input className="input" placeholder="Investor name" value={investment.name} onChange={(e) => setInvestment({ ...investment, name: e.currentTarget.value })} />
                <input className="input" type="number" placeholder="Amount ₹" value={investment.amount} onChange={(e) => setInvestment({ ...investment, amount: e.currentTarget.value })} />
                <input className="input" type="date" value={investment.date} onChange={(e) => setInvestment({ ...investment, date: e.currentTarget.value })} />
                <input className="input" placeholder="Note" value={investment.note} onChange={(e) => setInvestment({ ...investment, note: e.currentTarget.value })} />
              </div>
              <button className="btn btn-primary" onClick={() => void addInvestmentNow()}>Add investment</button>
              {investmentMsg && <p role="status" className="text-sm text-muted">{investmentMsg}</p>}
            </div>
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="card overflow-x-auto">
                <table className="w-full min-w-[520px] text-left text-sm">
                  <thead><tr><th className="px-3 py-2">Date</th><th className="px-3 py-2">Investor</th><th className="px-3 py-2 text-right">Amount</th><th /></tr></thead>
                  <tbody>{investments.map((row) => (
                    <tr key={row.id} className="border-t border-line">
                      <td className="px-3 py-2">{row.invested_on}</td>
                      <td className="px-3 py-2 font-medium">{row.investor_name}</td>
                      <td className="px-3 py-2 text-right">{money(row.amount_paise)}</td>
                      <td className="px-3 py-2 text-right"><button className="btn-mini btn-mini-danger" onClick={() => void removeInvestment(row.id)}><IconTrash /> Delete</button></td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
              <div className="card p-4">
                <h2 className="mb-3 text-sm font-medium">By investor</h2>
                {investments.length === 0 ? (
                  <p className="text-sm text-muted">No investments yet.</p>
                ) : (
                  <Donut items={Object.entries(investments.reduce<Record<string, number>>((acc, row) => { acc[row.investor_name] = (acc[row.investor_name] ?? 0) + row.amount_paise; return acc; }, {})).map(([label, value]) => ({ label, value }))} />
                )}
              </div>
            </div>
          </section>
        )}

        {view === "bills" && (
          <section className="space-y-4">
            <h1 className="text-xl font-semibold tracking-tight md:text-2xl">Invoices</h1>
            <div className="card overflow-x-auto">
              {bills.length === 0 ? (
                <EmptyState
                  illustration="invoices"
                  title="No invoices yet"
                  message="Bills you raise will be listed here with their payment status."
                  actionLabel="New bill"
                  onAction={() => { setView("billing"); setBill(null); }}
                />
              ) : (
                <table className="w-full min-w-[560px] text-left text-sm">
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
                      <tr key={row.id} className="border-t border-line">
                        <td className="px-3 py-2 font-medium">{row.billNo}</td>
                        <td className="px-3 py-2">{row.saleDate}</td>
                        <td className="px-3 py-2">{row.customerName ?? "Walk-in"}</td>
                        <td className="px-3 py-2 text-right">{money(row.totalPaise)}</td>
                        <td className="px-3 py-2">
                          {row.cancelled ? (
                            <span className="badge badge-bad">Cancelled</span>
                          ) : row.paidPaise < row.totalPaise ? (
                            <span className="badge badge-warn" title="Credit still due">
                              Credit {money(row.totalPaise - row.paidPaise)}
                            </span>
                          ) : (
                            <span className="badge badge-ok">Paid</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-right">
                          {row.cancelled ? (
                            <span className="btn-mini">Cancelled</span>
                          ) : row.paidPaise < row.totalPaise ? (
                            <span className="flex items-center justify-end gap-2">
                              <button
                                className="btn-mini"
                                onClick={async () => {
                                  const input = window.prompt(
                                    `Amount received (bill ${row.billNo})`,
                                    ((row.totalPaise - row.paidPaise) / 100).toFixed(2),
                                  );
                                  if (input === null) return;
                                  const amount = Math.round(Number(input) * 100);
                                  if (!Number.isFinite(amount) || amount <= 0) {
                                    setError("Enter a valid amount");
                                    return;
                                  }
                                  try {
                                    const res = await api.recordPayment(row.id, amount);
                                    setBills((await api.bills()).bills);
                                    setStats((await api.stats()).stats);
                                    setError(
                                      res.payment.creditPaise > 0
                                        ? `₹${(res.payment.creditPaise / 100).toFixed(2)} credit still due`
                                        : "Payment received — bill fully paid",
                                    );
                                  } catch (err) {
                                    setError(err instanceof Error ? err.message : String(err));
                                  }
                                }}
                              >
                                Record payment
                              </button>
                              <button className="btn-mini" onClick={() => void openBill(row.id)}><IconEye /> View</button>
                            </span>
                          ) : (
                            <button className="btn-mini" onClick={() => void openBill(row.id)}><IconEye /> View</button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {bill && shop && (
              <section className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold tracking-tight">Bill preview</h2>
                  <div className="flex items-center gap-3">
                    <button className="btn btn-primary" onClick={() => void emailBill(bill.id)}>Email bill</button>
                    <button className="btn-mini" onClick={() => setBill(null)}>Close</button>
                  </div>
                </div>
                {emailStatus && <p className="text-sm text-muted" role="status">{emailStatus}</p>}
                <div className="overflow-hidden rounded-xl border border-line bg-surface">
                  <iframe title={`Bill ${bill.billNo}`} className="h-[70vh] w-full lg:h-[1080px]" srcDoc={buildBillHtml(bill as never, shop)} />
                </div>
              </section>
            )}
          </section>
        )}

        {view === "billing" && (
          <section className="space-y-4">
            <h1 className="text-xl font-semibold tracking-tight md:text-2xl">New Bill</h1>
            <div className="card max-w-3xl space-y-3 p-4">
              <div className="grid gap-2 sm:grid-cols-4">
                <CustomerPicker
                  customers={customers}
                  value={pickedCustomer}
                  onSearch={setCustomerSearch}
                  onPick={(customer) => {
                    setPickedCustomer(customer);
                    setBillCustomer({
                      name: customer.name,
                      phone: customer.phone ?? "",
                      email: customer.email ?? "",
                      gstin: customer.gstin ?? "",
                    });
                  }}
                />
                <input className="input" placeholder="Customer name" value={billCustomer.name} onChange={(e) => setBillCustomer({ ...billCustomer, name: e.currentTarget.value })} />
                <input className="input" placeholder="Phone" value={billCustomer.phone} onChange={(e) => setBillCustomer({ ...billCustomer, phone: e.currentTarget.value })} />
                <input className="input" placeholder="Email (for bill)" value={billCustomer.email} onChange={(e) => setBillCustomer({ ...billCustomer, email: e.currentTarget.value })} />
              </div>
              <div className="grid gap-2 sm:grid-cols-4">
                <input className="input" placeholder="Customer GSTIN" value={billCustomer.gstin} onChange={(e) => setBillCustomer({ ...billCustomer, gstin: e.currentTarget.value })} />
                <p className="self-center text-xs text-muted">
                  {pickedCustomer
                    ? "Saved client — their details are updated in the master with this bill."
                    : "New client? Their details are saved into the customer master with this bill."}
                </p>
              </div>
              <div className="grid gap-2 sm:grid-cols-[2fr_1fr_1fr_1fr_auto]">
                <ItemPicker
                  items={items}
                  value={draft.itemId}
                  onChange={(id) => setDraft({ ...draft, itemId: id })}
                />
                <input className="input" type="number" placeholder={`Qty (${items.find((i) => i.id === draft.itemId)?.unit ?? "unit"})`} value={draft.qty} onChange={(e) => setDraft({ ...draft, qty: e.currentTarget.value })} />
                <input className="input" type="number" placeholder="Rate ₹" value={draft.rate} onChange={(e) => setDraft({ ...draft, rate: e.currentTarget.value })} />
                <input className="input" placeholder="HSN" value={draft.hsn} onChange={(e) => setDraft({ ...draft, hsn: e.currentTarget.value })} />
                <button className="btn btn-primary" onClick={addBillLine}>Add</button>
              </div>
              {billLines.length > 0 && (
                <table className="w-full min-w-[520px] text-left text-sm">
                  <thead><tr><th className="px-2 py-1">Item</th><th className="px-2 py-1">Qty</th><th className="px-2 py-1 text-right">Amount</th><th /></tr></thead>
                  <tbody>{billLines.map((l, idx) => (
                    <tr key={idx} className="border-t border-line">
                      <td className="px-2 py-1">{l.name}</td>
                      <td className="px-2 py-1">{qty(l.qtyBase, l.unit)}</td>
                      <td className="px-2 py-1 text-right">{money(l.totalPaise)}</td>
                      <td className="px-2 py-1 text-right"><button className="btn-mini" onClick={() => setBillLines(billLines.filter((_, i) => i !== idx))}>Remove</button></td>
                    </tr>
                  ))}</tbody>
                </table>
              )}
              <div className="grid gap-2 sm:grid-cols-6">
                <input className="input" type="number" placeholder="Discount ₹" value={billDiscount} onChange={(e) => setBillDiscount(e.currentTarget.value)} />
                <input className="input" type="number" placeholder="Delivery ₹" value={billSaleExpenses} onChange={(e) => setBillSaleExpenses(e.currentTarget.value)} />
                <select className="input" value={billGst} onChange={(e) => setBillGst(e.currentTarget.value)}>
                  <option value="0">GST 0%</option><option value="500">GST 5%</option><option value="1200">GST 12%</option><option value="1800">GST 18%</option><option value="2800">GST 28%</option>
                </select>
                <select className="input" value={billMode} onChange={(e) => setBillMode(e.currentTarget.value)}>
                  <option>Cash</option><option>UPI</option><option>Card</option><option>Credit</option>
                </select>
                <input className="input" type="date" value={billDate} onChange={(e) => setBillDate(e.currentTarget.value)} />
                <button className="btn btn-primary" onClick={() => void saveBill()}>Save bill</button>
              </div>
              <p className="text-sm text-muted">Subtotal {money(billSubtotal)} · GST {money(billGstPaise)} · <b>Total {money(billTotal)}</b></p>
              {billMsg && <p role="status" className="rounded bg-surface-2 px-3 py-2 text-sm">{billMsg}</p>}
              {lastBillId && <button className="btn btn-secondary" onClick={() => void openBill(lastBillId).then(() => setView("bills"))}>View last bill</button>}
            </div>
          </section>
        )}

        {view === "items" && (
          <section className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h1 className="text-xl font-semibold tracking-tight md:text-2xl">Items</h1>
              <button className="btn btn-primary" onClick={() => setItemForm({ id: null, name: "", unit: "kg", category: "", minStock: "", imageUrl: "" })}>
                <span className="flex items-center gap-1.5"><IconPlus size={15} /> Add item</span>
              </button>
            </div>
            {itemForm && (
              <div className="card max-w-3xl space-y-2 p-4">
                <div className="grid gap-2 sm:grid-cols-4">
                  <input className="input" placeholder="Item name" value={itemForm.name} onChange={(e) => setItemForm({ ...itemForm, name: e.currentTarget.value })} />
                  <select className="input" value={itemForm.unit} onChange={(e) => setItemForm({ ...itemForm, unit: e.currentTarget.value })}>
                    <option value="kg">kg</option><option value="l">l</option><option value="pcs">pcs</option>
                  </select>
                  <input className="input" placeholder="Category" value={itemForm.category} onChange={(e) => setItemForm({ ...itemForm, category: e.currentTarget.value })} />
                  <div className="flex gap-2">
                    <button className="btn btn-primary" onClick={() => void saveItem()}>Save</button>
                    <button className="btn-mini" onClick={() => setItemForm(null)}>Cancel</button>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-xl border border-line bg-surface-2 text-muted">
                    {itemForm.imageUrl ? (
                      <img src={itemForm.imageUrl} alt="" className="size-full object-cover" loading="lazy" />
                    ) : (
                      <IconImage size={16} />
                    )}
                  </span>
                  <input
                    className="input max-w-md flex-1"
                    placeholder="Image link (https://…png) — optional"
                    value={itemForm.imageUrl}
                    onChange={(e) => setItemForm({ ...itemForm, imageUrl: e.currentTarget.value })}
                  />
                </div>
              </div>
            )}
            {itemsMsg && <p role="status" className="text-sm text-muted">{itemsMsg}</p>}
            {items.length === 0 ? (
              <div className="card p-4">
                <EmptyState
                  illustration="items"
                  title="No items yet"
                  message="Add the products you buy and sell — stock, cost and profit follow automatically."
                  actionLabel="Add item"
                  onAction={() => setItemForm({ id: null, name: "", unit: "kg", category: "", minStock: "", imageUrl: "" })}
                />
              </div>
            ) : (
              <div className="card overflow-x-auto">
                <table className="w-full min-w-[560px] text-left text-sm">
                  <thead>
                    <tr>
                      <th className="px-3 py-2">Item</th>
                      <th className="px-3 py-2">Unit</th>
                      <th className="px-3 py-2">Category</th>
                      <th className="px-3 py-2 text-right">Stock left</th>
                      <th className="px-3 py-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => (
                      <tr key={item.id} className="border-t border-line">
                        <td className="px-3 py-2">
                          <span className="flex items-center gap-2">
                            <ItemThumb item={item} />
                            <span className="font-medium">{item.name}</span>
                          </span>
                        </td>
                        <td className="px-3 py-2">{item.unit}</td>
                        <td className="px-3 py-2">{item.category ?? "—"}</td>
                        <td className="px-3 py-2 text-right">{qty(item.stockLeftBase, item.unit)}</td>
                        <td className="px-3 py-2 text-right">
                          <button className="btn-mini" onClick={() => setItemForm({ id: item.id, name: item.name, unit: item.unit, category: item.category ?? "", minStock: "", imageUrl: item.imageUrl ?? "" })}><IconEdit /> Edit</button>
                          <button className="btn-mini ml-2" onClick={() => void openLots(item)}>Lots</button>
                          {user.role === "owner" && (
                            <button
                              className="btn-mini btn-mini-danger ml-2"
                              onClick={async () => {
                                if (!window.confirm(`Delete ${item.name}?`)) return;
                                try {
                                  await api.deleteItem(item.id);
                                  setItems((await api.items()).items);
                                  setItemsMsg(`${item.name} deleted`);
                                } catch (err) {
                                  setItemsMsg(err instanceof Error ? err.message : String(err));
                                }
                              }}
                            >
                              Delete
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {lotItem && (
              <section className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-lg font-semibold tracking-tight">
                    Lots — {lotItem.name}
                    <span className="ml-2 text-sm font-normal text-muted">per purchase batch</span>
                  </h2>
                  <button className="btn-mini" onClick={() => { setLotItem(null); setLotLedger(null); setLotError(null); setExpandedLot(null); }}>Close</button>
                </div>
                {lotLoading && <p className="text-sm text-muted">Loading lots…</p>}
                {lotError && <p role="status" className="text-sm text-error-ink">{lotError}</p>}
                {lotLedger && (
                  <>
                    {lotLedger.batches.length === 0 ? (
                      <div className="card p-4 text-sm text-muted">No purchase lots for this item yet.</div>
                    ) : (
                      <div className="card overflow-x-auto">
                        <table className="w-full min-w-[860px] text-left text-sm">
                          <thead>
                            <tr>
                              <th className="px-3 py-2">Lot</th>
                              <th className="px-3 py-2">Purchased</th>
                              <th className="px-3 py-2">Supplier</th>
                              <th className="px-3 py-2 text-right">Bought</th>
                              <th className="px-3 py-2 text-right">Unit cost</th>
                              <th className="px-3 py-2 text-right">Sold qty</th>
                              <th className="px-3 py-2 text-right">Sold value</th>
                              <th className="px-3 py-2 text-right">Profit</th>
                              <th className="px-3 py-2 text-right">Pending</th>
                              <th className="px-3 py-2 text-right">Pending value</th>
                            </tr>
                          </thead>
                          <tbody>
                            {lotLedger.batches.map((row) => {
                              const open = expandedLot === row.batchId;
                              return (
                                <Fragment key={row.batchId}>
                                  <tr
                                    className="cursor-pointer border-t border-line hover:bg-surface-2"
                                    onClick={() => setExpandedLot(open ? null : row.batchId)}
                                  >
                                    <td className="px-3 py-2">
                                      <span className="inline-flex items-center gap-1 font-medium">
                                        {open ? <IconClose size={13} /> : <IconEye />}#{row.batchId}
                                      </span>
                                    </td>
                                    <td className="px-3 py-2">{row.purchaseDate}</td>
                                    <td className="px-3 py-2">{row.supplierName ?? "—"}</td>
                                    <td className="px-3 py-2 text-right">{qty(row.qtyOriginal, lotLedger.unit)}</td>
                                    <td className="px-3 py-2 text-right">{money(row.unitPricePaise)}</td>
                                    <td className="px-3 py-2 text-right">{qty(row.qtySold, lotLedger.unit)}</td>
                                    <td className="px-3 py-2 text-right">{money(row.soldValuePaise)}</td>
                                    <td className={`px-3 py-2 text-right ${row.profitPaise >= 0 ? "text-success-ink" : "text-error-ink"}`}>{money(row.profitPaise)}</td>
                                    <td className="px-3 py-2 text-right">{qty(row.qtyRemaining, lotLedger.unit)}</td>
                                    <td className="px-3 py-2 text-right">{money(row.pendingValuePaise)}</td>
                                  </tr>
                                  {open && (
                                    <tr className="border-t border-line bg-surface-2/60">
                                      <td colSpan={10} className="px-3 py-3">
                                        {row.sales.length === 0 ? (
                                          <p className="text-xs text-muted">Nothing sold from this lot yet.</p>
                                        ) : (
                                          <div className="overflow-x-auto">
                                            <table className="w-full min-w-[560px] text-left text-xs">
                                              <thead>
                                                <tr className="text-muted">
                                                  <th className="px-2 py-1">Bill</th>
                                                  <th className="px-2 py-1">Date</th>
                                                  <th className="px-2 py-1">Customer</th>
                                                  <th className="px-2 py-1 text-right">Qty from this lot</th>
                                                  <th className="px-2 py-1 text-right">Sale rate</th>
                                                  <th className="px-2 py-1 text-right">Revenue share</th>
                                                  <th className="px-2 py-1 text-right">COGS</th>
                                                  <th className="px-2 py-1 text-right">Profit</th>
                                                </tr>
                                              </thead>
                                              <tbody>
                                                {row.sales.map((sale) => (
                                                  <tr key={`${row.batchId}-${sale.billNo}-${sale.saleDate}`} className="border-t border-line/60">
                                                    <td className="px-2 py-1 font-medium">{sale.billNo}</td>
                                                    <td className="px-2 py-1">{sale.saleDate}</td>
                                                    <td className="px-2 py-1">{sale.customerName ?? "—"}</td>
                                                    <td className="px-2 py-1 text-right">{qty(sale.qtyTaken, lotLedger.unit)}</td>
                                                    <td className="px-2 py-1 text-right">{money(sale.unitPricePaise)}</td>
                                                    <td className="px-2 py-1 text-right">{money(sale.revenuePaise)}</td>
                                                    <td className="px-2 py-1 text-right">{money(sale.cogsPaise)}</td>
                                                    <td className={`px-2 py-1 text-right ${sale.profitPaise >= 0 ? "text-success-ink" : "text-error-ink"}`}>{money(sale.profitPaise)}</td>
                                                  </tr>
                                                ))}
                                              </tbody>
                                            </table>
                                          </div>
                                        )}
                                      </td>
                                    </tr>
                                  )}
                                </Fragment>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </>
                )}
              </section>
            )}
          </section>
        )}

        {view === "team" && user.role === "owner" && (
          <section className="space-y-4">
            <h1 className="text-xl font-semibold tracking-tight md:text-2xl">Team</h1>
            {usage.length > 0 && (
              <div className="card overflow-x-auto">
                <div className="px-4 py-3">
                  <h2 className="text-sm font-medium">Usage</h2>
                  <p className="text-xs text-muted">Who logged in, when they signed out and how long they were active.</p>
                </div>
                <table className="w-full min-w-[560px] text-left text-sm">
                  <thead>
                    <tr>
                      <th className="px-3 py-2">Member</th>
                      <th className="px-3 py-2 text-right">Sessions</th>
                      <th className="px-3 py-2 text-right">Active time</th>
                      <th className="px-3 py-2">Last login</th>
                      <th className="px-3 py-2">Last logout</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usage.map((row) => (
                      <tr key={row.userId} className="border-t border-line">
                        <td className="px-3 py-2 font-medium">
                          {row.name} <span className="text-muted">· {row.role}</span>
                        </td>
                        <td className="px-3 py-2 text-right">{row.sessions}</td>
                        <td className="px-3 py-2 text-right">{formatDuration(row.activeSeconds)}</td>
                        <td className="px-3 py-2">{row.lastLoginAt ? new Date(row.lastLoginAt).toLocaleString("en-IN") : "—"}</td>
                        <td className="px-3 py-2">
                          {row.lastLogoutAt ? (
                            new Date(row.lastLogoutAt).toLocaleString("en-IN")
                          ) : row.openSessions > 0 ? (
                            <span className="badge badge-warn">still active</span>
                          ) : (
                            "—"
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div className="card space-y-3 p-4">
              {members.map((member) => (
                <div key={member.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-line pb-2 text-sm last:border-0">
                  <span>
                    <b>{member.name}</b> · {member.phone} · {member.role}
                    {member.pending && <span className="ml-2 rounded-full bg-accent-soft px-2 py-0.5 text-xs text-accent-ink">awaiting approval</span>}
                    {!member.pending && !member.active && <span className="ml-2 rounded-full bg-error-soft px-2 py-0.5 text-xs text-error-ink">disabled</span>}
                  </span>
                  {member.pending ? (
                    <span className="flex items-center gap-2">
                      <select
                        className="input"
                        value={approveRole[member.id] ?? "staff"}
                        onChange={(e) => setApproveRole({ ...approveRole, [member.id]: e.currentTarget.value as "staff" | "owner" })}
                      >
                        <option value="staff">Staff</option>
                        <option value="owner">Owner</option>
                      </select>
                      <button className="btn-mini btn-mini-ok" onClick={() => void api.approveUser(member.id, approveRole[member.id] ?? "staff").then(loadMembers).then(() => setTeamStatus(`${member.name} approved`))}>Approve</button>
                      <button className="btn-mini btn-mini-danger" onClick={() => void api.rejectUser(member.id).then(loadMembers).then(() => setTeamStatus("Request rejected"))}>Reject</button>
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <select
                        className="input"
                        value={member.role}
                        disabled={member.phone === "7569208757"}
                        onChange={(e) => {
                          const role = e.currentTarget.value as "staff" | "owner";
                          void api.setUserRole(member.id, role).then(loadMembers).then(() => setTeamStatus(`${member.name} is now ${role}`));
                        }}
                      >
                        <option value="staff">Staff</option>
                        <option value="owner">Owner</option>
                      </select>
                      <button className="btn-mini" onClick={() => { setResetTarget(member); setResetPassword(""); }}>Reset password</button>
                      <button className={`btn-mini ${member.active ? "btn-mini-danger" : "btn-mini-ok"}`} onClick={() => void toggleMember(member)}>
                        {member.active ? "Deactivate" : "Enable"}
                      </button>
                    </span>
                  )}
                </div>
              ))}
              {resetTarget && (
                <div className="flex flex-wrap items-center gap-2 rounded-xl bg-surface-2 p-3">
                  <span className="text-sm">New password for <b>{resetTarget.name}</b>:</span>
                  <input className="input flex-1" type="password" value={resetPassword} onChange={(e) => setResetPassword(e.currentTarget.value)} />
                  <button className="btn btn-primary" onClick={() => void saveResetPassword()}>Save</button>
                  <button className="btn-mini" onClick={() => setResetTarget(null)}>Cancel</button>
                </div>
              )}
              <div className="grid gap-2 sm:grid-cols-3">
                <input className="input" placeholder="Name" value={memberName} onChange={(e) => setMemberName(e.currentTarget.value)} />
                <input className="input" placeholder="Phone (10 digits)" value={memberPhone} onChange={(e) => setMemberPhone(e.currentTarget.value)} />
                <input className="input" type="password" placeholder="Password (6+)" value={memberPassword} onChange={(e) => setMemberPassword(e.currentTarget.value)} />
              </div>
              <button className="btn btn-primary" onClick={() => void addMember()}>Add member</button>
              {teamStatus && <p role="status" className="text-sm text-muted">{teamStatus}</p>}
            </div>
          </section>
        )}

        {view === "settings" && user.role === "owner" && (
          <section className="space-y-4">
            <h1 className="text-xl font-semibold tracking-tight md:text-2xl">Settings</h1>
            <div className="card space-y-3 p-4">
              <div>
                <h2 className="text-sm font-medium">Stock costing</h2>
                <p className="text-sm text-muted">
                  Weighted average keeps one average cost per item; FIFO costs each sale from the oldest batch.
                </p>
              </div>
              <div className="flex flex-wrap items-end gap-2">
                <select
                  className="input max-w-56"
                  value={costingMethod}
                  onChange={(e) => {
                    const method = e.currentTarget.value as "WAC" | "FIFO";
                    setCostingMethodState(method);
                    void api.setCostingMethod(method).then(() => setCostingMsg(`Costing method set to ${method}`));
                  }}
                >
                  <option value="WAC">Weighted average (WAC)</option>
                  <option value="FIFO">FIFO (batch-wise)</option>
                </select>
                {costingMsg && <span className="text-sm text-muted">{costingMsg}</span>}
              </div>
            </div>
            <div className="card space-y-4 p-4">
              <div>
                <h2 className="text-sm font-medium">Email notifications</h2>
                <p className="text-sm text-muted">
                  Owner alerts for signups, member changes and staff bills.{" "}
                  <b>{emailConfigured ? "Email configured ✓" : "Email NOT configured (add RESEND_API_KEY)"}</b>
                </p>
              </div>
              <div className="space-y-1">
                <label className="label" htmlFor="notify-emails">Notify these emails (comma separated)</label>
                <input id="notify-emails" className="input" value={notifyEmails} onChange={(e) => setNotifyEmails(e.currentTarget.value)} />
              </div>
              <div className="flex flex-wrap gap-4 text-sm">
                <label className="flex items-center gap-2"><input type="checkbox" checked={notifySignup} onChange={(e) => setNotifySignup(e.currentTarget.checked)} /> New account requests</label>
                <label className="flex items-center gap-2"><input type="checkbox" checked={notifyMember} onChange={(e) => setNotifyMember(e.currentTarget.checked)} /> Member changes</label>
                <label className="flex items-center gap-2"><input type="checkbox" checked={notifyBill} onChange={(e) => setNotifyBill(e.currentTarget.checked)} /> Staff-created bills</label>
              </div>
              <div className="space-y-1">
                <label className="label" htmlFor="resend-key">Resend API key (stored encrypted in the database)</label>
                <input id="resend-key" type="password" className="input" placeholder={emailConfigured ? "Key saved ✓ — enter a new key to replace" : "re_…"} value={resendKey} onChange={(e) => setResendKey(e.currentTarget.value)} />
                <p className="text-xs text-muted">Encrypted with the Worker secret; never shown again. Prefer the Cloudflare secret for extra safety.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button className="btn btn-primary" onClick={() => void saveNotify()}>Save settings</button>
                <button className="btn btn-secondary" onClick={() => void testNotify()}>Send test email</button>
              </div>
              {notifyStatus && <p role="status" className="text-sm text-muted">{notifyStatus}</p>}
            </div>
          </section>
        )}

        {view === "activity" && (() => {
          const actors = [...new Set(activity.map((row) => row.actor))].sort();
          const shown = activity.filter((row) => !activityFilter || row.actor === activityFilter);
          const days = shown.reduce<Record<string, ActivityRow[]>>((acc, row) => {
            const day = new Date(row.at).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
            (acc[day] ??= []).push(row);
            return acc;
          }, {});
          const dot = (event: string) =>
            event.startsWith("sale")
              ? "bg-chart-2"
              : event.startsWith("purchase")
                ? "bg-chart-3"
                : event.startsWith("expense")
                  ? "bg-chart-4"
                  : event.startsWith("user")
                    ? "bg-chart-1"
                    : event.startsWith("investment")
                      ? "bg-chart-6"
                      : event.startsWith("item")
                        ? "bg-chart-5"
                        : "bg-chart-6";
          return (
            <section className="space-y-4">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h1 className="text-xl font-semibold tracking-tight md:text-2xl">Activity</h1>
                  <p className="text-sm text-muted">{shown.length} events · who did what, when</p>
                </div>
                <div className="flex items-center gap-2">
                  <select className="input max-w-52" value={activityFilter} onChange={(e) => setActivityFilter(e.currentTarget.value)}>
                    <option value="">All members</option>
                    {actors.map((actor) => (
                      <option key={actor} value={actor}>{actor}</option>
                    ))}
                  </select>
                  <button
                    className="btn-mini"
                    onClick={() => void api.activity().then((res) => setActivity(res.activity))}
                  >
                    Refresh
                  </button>
                </div>
              </div>
              {Object.entries(days).map(([day, rows]) => (
                <div key={day} className="space-y-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">{day}</p>
                  <div className="card divide-y divide-line">
                    {rows.map((row) => (
                      <div key={row.id} className="flex items-start gap-3 p-3">
                        <span className={`mt-1.5 size-2 shrink-0 rounded-full ${dot(row.event)}`} />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm text-ink">{row.summary}</p>
                          <p className="mt-0.5 text-xs text-muted">
                            {new Date(row.at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                            <span className="mx-1.5">·</span>
                            <span className="inline-flex items-center rounded-full bg-surface-2 px-2 py-0.5 text-[11px] text-muted">{row.actor}</span>
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              {shown.length === 0 && <p className="text-sm text-muted">No activity yet.</p>}
            </section>
          );
        })()}
      </main>
    </div>
  );
}
