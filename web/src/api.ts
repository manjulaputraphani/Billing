export type User = { id: number; name: string; role: "owner" | "staff" };

export type Item = {
  id: number;
  name: string;
  unit: string;
  category: string | null;
  minStockBase: number;
  stockLeftBase: number;
};

export type BillRow = {
  id: number;
  billNo: string;
  customerName: string | null;
  saleDate: string;
  totalPaise: number;
  paidPaise: number;
  paymentMode: string;
  cancelled: boolean;
};

export type BillLine = {
  itemName: string;
  unit: string;
  qtyBase: number;
  unitPricePaise: number;
  hsnCode: string | null;
  lineTotalPaise: number;
  costPaise: number;
  profitPaise: number;
};

export type BillDetail = BillRow & {
  customerPhone: string | null;
  customerAddress: string | null;
  customerGstin: string | null;
  customerEmail: string | null;
  subtotalPaise: number;
  discountPaise: number;
  gstPaise: number;
  gstRateBp: number;
  lines: BillLine[];
};

export type Member = { id: number; name: string; phone: string; role: "owner" | "staff"; active: boolean; pending: boolean };

export type ClosingStockRow = {
  itemId: number;
  name: string;
  unit: string;
  qtyBase: number;
  valuePaise: number;
  avgCostPaise: number;
};

export type FinYearReport = {
  finYear: string;
  startDate: string;
  endDate: string;
  turnoverPaise: number;
  discountsPaise: number;
  gstPaise: number;
  salesCount: number;
  purchaseValuePaise: number;
  purchaseExpensesPaise: number;
  totalPurchasesPaise: number;
  cogsPaise: number;
  grossProfitPaise: number;
  saleExpensesPaise: number;
  generalExpensesPaise: number;
  netProfitPaise: number;
  closingStock: ClosingStockRow[];
  closingStockQtyBase: number;
  closingStockValuePaise: number;
};

export type DealProfit = {
  saleId: number;
  billNo: string;
  date: string;
  customerName: string | null;
  saleValuePaise: number;
  discountPaise: number;
  cogsPaise: number;
  grossProfitPaise: number;
  saleExpensesPaise: number;
  netProfitPaise: number;
  profitPercent: number;
  lines: Array<{
    itemName: string;
    qtyBase: number;
    unit: string;
    ratePaise: number;
    avgCostPaise: number;
    saleValuePaise: number;
    cogsPaise: number;
    profitPaise: number;
    profitPercent: number;
  }>;
};

export type UsageRow = {
  userId: number;
  name: string;
  phone: string;
  role: string;
  sessions: number;
  activeSeconds: number;
  openSessions: number;
  lastLoginAt: string | null;
  lastLogoutAt: string | null;
};

export type ActivityRow = {
  id: number;
  at: string;
  actor: string;
  event: string;
  summary: string;
};

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(path, {
    credentials: "include",
    ...init,
    headers: { "content-type": "application/json", ...(init.headers ?? {}) },
  });
  const data = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new Error(data.error ?? `Request failed (${res.status})`);
  return data;
}

export const api = {
  login: (phone: string, password: string) =>
    request<{ user: User }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ phone, password }),
    }),
  logout: () => request<{ ok: boolean }>("/api/auth/logout", { method: "POST" }),
  me: () => request<{ user: User }>("/api/auth/me"),
  items: () => request<{ items: Item[] }>("/api/items"),
  createItem: (body: { name: string; unit: string; category?: string; minStockBase: number }) =>
    request<{ item: Item }>("/api/items", { method: "POST", body: JSON.stringify(body) }),
  deleteItem: (id: number) => request<{ ok: boolean }>(`/api/items/${id}`, { method: "DELETE" }),
  updateItem: (id: number, body: { name: string; unit: string; category?: string; minStockBase: number }) =>
    request<{ item: Item }>(`/api/items/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  createCustomer: (body: { name: string; phone?: string; email?: string; gstin?: string; address?: string }) =>
    request<{ customer: { id: number } }>("/api/customers", { method: "POST", body: JSON.stringify(body) }),
  statsDaily: (days = 14) =>
    request<{ daily: Array<{ date: string; sales: string; expenses: string }> }>(`/api/stats/daily?days=${days}`),
  expenseCategories: () =>
    request<{ categories: Array<{ category: string; total: string }> }>("/api/stats/expense-categories"),
  investments: () =>
    request<{ investments: Array<{ id: number; investor_name: string; amount_paise: number; invested_on: string; note: string | null }>; totalPaise: number }>(
      "/api/investments",
    ),
  addInvestment: (body: { investorName: string; amountPaise: number; date: string; note?: string }) =>
    request<{ ok: boolean; id: number }>("/api/investments", { method: "POST", body: JSON.stringify(body) }),
  deleteInvestment: (id: number) => request<{ ok: boolean }>(`/api/investments/${id}`, { method: "DELETE" }),
  stats: () => request<{ stats: { today_sales: number; month_sales: number; month_profit: number; month_expenses: number; low_stock: number } }>("/api/stats"),
  purchases: () => request<{ purchases: Array<{ id: number; name: string; unit: string; qty_base: number; unit_price_paise: number; total_paise: number; purchase_date: string }> }>("/api/purchases"),
  addPurchase: (body: { itemId: number; qty: number; unitPricePaise: number; expensesPaise?: number; date: string; supplierName?: string; paymentMode?: string }) =>
    request<{ purchase: { purchaseId: number } }>("/api/purchases", { method: "POST", body: JSON.stringify(body) }),
  batches: (itemId: number) => request<{ batches: Array<{ id: number; qty_remaining: number; unit_price_paise: number; purchase_date: string }> }>(`/api/items/${itemId}/batches`),
  saveStock: (body: Record<string, unknown>) => request<{ stock: unknown }>("/api/stock", { method: "POST", body: JSON.stringify(body) }),
  expenses: () => request<{ expenses: Array<{ id: number; category: string; amountPaise: number; date: string; paymentMode: string | null; paidTo: string | null; note: string | null }> }>("/api/expenses"),
  addExpense: (body: Record<string, unknown>) => request<{ expense: unknown }>("/api/expenses", { method: "POST", body: JSON.stringify(body) }),
  createBill: (body: Record<string, unknown>) => request<{ bill: { saleId: number; billNo: string; totalPaise: number } }>("/api/bills", { method: "POST", body: JSON.stringify(body) }),
  bills: () => request<{ bills: BillRow[] }>("/api/bills?limit=100"),
  bill: (id: number) => request<{ bill: BillDetail }>(`/api/bills/${id}`),
  activity: () => request<{ activity: ActivityRow[] }>("/api/activity?limit=25"),
  shop: () => request<{ shop: Record<string, string> }>("/api/shop"),
  signup: (name: string, phone: string, password: string) =>
    request<{ ok: boolean; pending: boolean }>("/api/auth/signup", {
      method: "POST",
      body: JSON.stringify({ name, phone, password }),
    }),
  notifySettings: () =>
    request<{ emails: string[]; signup: boolean; member: boolean; bill: boolean; emailConfigured: boolean; defaultEmail: string }>(
      "/api/settings/notifications",
    ),
  saveNotifySettings: (body: {
    emails: string;
    signup: boolean;
    member: boolean;
    bill: boolean;
    resendApiKey?: string;
    clearResendKey?: boolean;
  }) =>
    request<{ ok: boolean }>("/api/settings/notifications", { method: "PUT", body: JSON.stringify(body) }),
  testNotify: () => request<{ ok: boolean; to?: string[] }>("/api/settings/notifications/test", { method: "POST" }),
  users: () => request<{ users: Member[] }>("/api/users"),
  setUserRole: (id: number, role: "staff" | "owner") =>
    request<{ ok: boolean; role: string }>(`/api/users/${id}/role`, { method: "POST", body: JSON.stringify({ role }) }),
  approveUser: (id: number, role: "staff" | "owner") =>
    request<{ ok: boolean; role: string }>(`/api/users/${id}/approve`, { method: "POST", body: JSON.stringify({ role }) }),
  rejectUser: (id: number) => request<{ ok: boolean }>(`/api/users/${id}/reject`, { method: "POST" }),
  addUser: (name: string, phone: string, password: string) =>
    request<{ user: Member }>("/api/users", { method: "POST", body: JSON.stringify({ name, phone, password }) }),
  resetUserPassword: (id: number, password: string) =>
    request<{ ok: boolean }>(`/api/users/${id}/password`, { method: "POST", body: JSON.stringify({ password }) }),
  setUserActive: (id: number, active: boolean) =>
    request<{ ok: boolean }>(`/api/users/${id}/active`, { method: "POST", body: JSON.stringify({ active }) }),
  emailBill: (id: number) => request<{ ok: boolean; to?: string }>(`/api/bills/${id}/email`, { method: "POST" }),
  finYears: () => request<{ finYears: string[] }>("/api/reports/fin-years"),
  finYearReport: (finYear: string) => request<{ report: FinYearReport }>(`/api/reports/fin-year?fy=${finYear}`),
  dealProfits: (finYear: string) => request<{ deals: DealProfit[] }>(`/api/reports/deals?fy=${finYear}`),
  usage: () => request<{ usage: UsageRow[] }>("/api/usage"),
  costingMethod: () => request<{ method: "WAC" | "FIFO" }>("/api/settings/costing"),
  setCostingMethod: (method: "WAC" | "FIFO") =>
    request<{ ok: boolean; method: string }>("/api/settings/costing", { method: "POST", body: JSON.stringify({ method }) }),
};

export const money = (paise: number): string =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(paise / 100);

export const qty = (base: number, unit: string): string => {
  const factor = unit === "kg" || unit === "l" ? 1000 : 1;
  return factor === 1 ? `${base} ${unit}` : `${(base / factor).toFixed(2)} ${unit}`;
};
