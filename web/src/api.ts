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
  updateItem: (id: number, body: { name: string; unit: string; category?: string; minStockBase: number }) =>
    request<{ item: Item }>(`/api/items/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  createCustomer: (body: { name: string; phone?: string; email?: string; gstin?: string; address?: string }) =>
    request<{ customer: { id: number } }>("/api/customers", { method: "POST", body: JSON.stringify(body) }),
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
};

export const money = (paise: number): string =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(paise / 100);

export const qty = (base: number, unit: string): string => {
  const factor = unit === "kg" || unit === "l" ? 1000 : 1;
  return factor === 1 ? `${base} ${unit}` : `${(base / factor).toFixed(2)} ${unit}`;
};
