import { useEffect, useState } from "react";
import { getVersion } from "@tauri-apps/api/app";
import { chat } from "../ai/ollama";
import { DEFAULT_AI_CONFIG, getAiConfig, saveAiConfig, type AiConfig } from "../db/settings";
import { useDb } from "../lib/db-context";
import { deleteSecret, getSecret, hashPin, saveSecret, SECRET_KEYS, verifyPin } from "../lib/secrets";
import { listActivity, logActivity, type ActivityRow } from "../db/activity";
import {
  DEFAULT_EMAIL,
  DEFAULT_SHOP,
  getEmailSettings,
  getShopDetails,
  saveEmailSettings,
  saveShopDetails,
  type EmailSettings,
  type ShopDetails,
} from "../db/settings";
import { sendEmail } from "../lib/email";

const PIN_RE = /^\d{4,6}$/;

export default function Settings({
  onReset,
  onLock,
}: {
  onReset: () => void;
  onLock: () => void;
}) {
  const db = useDb();
  const [ai, setAi] = useState<AiConfig>(DEFAULT_AI_CONFIG);
  const [aiKeySaved, setAiKeySaved] = useState(false);
  const [keyInput, setKeyInput] = useState("");
  const [aiStatus, setAiStatus] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [version, setVersion] = useState<string | null>(null);
  const [stored, setStored] = useState<{ db: boolean; pin: boolean; aiKey: boolean } | null>(null);
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [pinBusy, setPinBusy] = useState(false);
  const [pinError, setPinError] = useState<string | null>(null);
  const [pinStatus, setPinStatus] = useState<string | null>(null);
  const [activity, setActivity] = useState<ActivityRow[]>([]);
  const [shop, setShop] = useState<ShopDetails>(DEFAULT_SHOP);
  const [emailCfg, setEmailCfg] = useState<EmailSettings>(DEFAULT_EMAIL);
  const [emailKeyInput, setEmailKeyInput] = useState("");
  const [emailKeySaved, setEmailKeySaved] = useState(false);
  const [emailStatus, setEmailStatus] = useState<string | null>(null);
  const [testTo, setTestTo] = useState("");
  const [shopStatus, setShopStatus] = useState<string | null>(null);

  useEffect(() => {
    listActivity(db)
      .then(setActivity)
      .catch(() => setActivity([]));
  }, [db]);

  useEffect(() => {
    getShopDetails(db)
      .then(setShop)
      .catch(() => setShop(DEFAULT_SHOP));
    getEmailSettings(db)
      .then(setEmailCfg)
      .catch(() => setEmailCfg(DEFAULT_EMAIL));
    getSecret(SECRET_KEYS.SMTP_PASSWORD)
      .then((value) => setEmailKeySaved(Boolean(value)))
      .catch(() => setEmailKeySaved(false));
  }, [db]);

  async function saveEmailCfg() {
    setError(null);
    setEmailStatus(null);
    try {
      await saveEmailSettings(db, emailCfg);
      setEmailStatus("Email settings saved");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function saveEmailKey() {
    const value = emailKeyInput.trim();
    if (!value) return;
    setError(null);
    try {
      await saveSecret(SECRET_KEYS.SMTP_PASSWORD, value);
      setEmailKeyInput("");
      setEmailKeySaved(true);
      setEmailStatus("App password saved to Keychain");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function sendTestEmail() {
    setEmailStatus("Sending test email…");
    try {
      const password = await getSecret(SECRET_KEYS.SMTP_PASSWORD);
      if (!password) {
        setEmailStatus("Save the Gmail app password first");
        return;
      }
      await sendEmail({
        host: emailCfg.host,
        port: Number(emailCfg.port) || 465,
        username: emailCfg.fromEmail,
        password,
        fromEmail: emailCfg.fromEmail,
        fromName: emailCfg.fromName,
        to: testTo.trim() || emailCfg.fromEmail,
        subject: "Stock Tracker test email",
        html: "<p>This is a test email from Stock Tracker. Your bill emails are ready.</p>",
      });
      setEmailStatus("Test email sent — check your inbox");
    } catch (err) {
      setEmailStatus(`Email failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  async function saveShop() {
    setError(null);
    setShopStatus(null);
    try {
      await saveShopDetails(db, shop);
      setShopStatus("Shop details saved");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  useEffect(() => {
    void (async () => {
      try {
        const [dbUrl, pinHash, apiKey] = await Promise.all([
          getSecret(SECRET_KEYS.DATABASE_URL),
          getSecret(SECRET_KEYS.PIN_HASH),
          getSecret(SECRET_KEYS.OLLAMA_API_KEY),
        ]);
        setStored({ db: Boolean(dbUrl), pin: Boolean(pinHash), aiKey: Boolean(apiKey) });
        setAiKeySaved(Boolean(apiKey));
      } catch {
        setStored({ db: false, pin: false, aiKey: false });
      }
    })();
  }, []);

  useEffect(() => {
    getVersion()
      .then(setVersion)
      .catch(() => setVersion(null));
  }, []);

  useEffect(() => {
    getAiConfig(db)
      .then(setAi)
      .catch(() => setAi(DEFAULT_AI_CONFIG));
  }, [db]);

  async function persistAi(next: AiConfig) {
    setAi(next);
    try {
      await saveAiConfig(db, next);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function saveKey() {
    const value = keyInput.trim();
    if (!value) return;
    try {
      await saveSecret(SECRET_KEYS.OLLAMA_API_KEY, value);
      setKeyInput("");
      setAiKeySaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  async function testAi() {
    setAiStatus("Testing…");
    try {
      const apiKey = ai.mode === "cloud" ? await getSecret(SECRET_KEYS.OLLAMA_API_KEY) : null;
      await chat({ ...ai, apiKey }, [
        { role: "user", content: "Reply with the single word OK." },
      ]);
      setAiStatus("AI OK");
    } catch (err) {
      setAiStatus(`AI failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  async function resetConnection() {
    setBusy(true);
    setError(null);
    try {
      await deleteSecret(SECRET_KEYS.DATABASE_URL);
      await deleteSecret(SECRET_KEYS.PIN_HASH);
      try {
        await logActivity(db, {
          event: "reset",
          summary: "Connection and PIN removed from this computer",
        });
      } catch {
        // Logging must not block the reset.
      }
      onReset();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function lockNow() {
    try {
      await logActivity(db, { event: "lock", summary: "Locked the app" });
    } catch {
      // Never block locking on a logging failure.
    }
    onLock();
  }

  async function changePin() {
    setPinError(null);
    setPinStatus(null);
    if (!PIN_RE.test(newPin)) {
      setPinError("PIN must be 4-6 digits");
      return;
    }
    if (newPin !== confirmPin) {
      setPinError("PINs do not match");
      return;
    }
    setPinBusy(true);
    try {
      const hash = await getSecret(SECRET_KEYS.PIN_HASH);
      if (!hash) {
        setPinError("No PIN is saved on this computer. Reset the connection to start again.");
        return;
      }
      if (!(await verifyPin(currentPin, hash))) {
        setPinError("Current PIN is incorrect");
        return;
      }
      await saveSecret(SECRET_KEYS.PIN_HASH, await hashPin(newPin));
      setPinStatus("PIN updated");
      setCurrentPin("");
      setNewPin("");
      setConfirmPin("");
    } catch (err) {
      setPinError(err instanceof Error ? err.message : String(err));
    } finally {
      setPinBusy(false);
    }
  }

  async function removeAiKey() {
    setError(null);
    try {
      await deleteSecret(SECRET_KEYS.OLLAMA_API_KEY);
      setAiKeySaved(false);
      setStored((prev) => (prev ? { ...prev, aiKey: false } : prev));
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="page-title">Settings</h1>

      <section className="space-y-3 card p-4">
        <div>
          <h2 className="text-sm font-medium">Security</h2>
          <p className="text-sm text-gray-500">
            Secrets live in this Mac's Keychain — never in files or the database. The PIN is stored
            only as an argon2id hash.
          </p>
        </div>
        <ul className="space-y-1 rounded-xl bg-stone-50 px-3 py-2 text-sm">
          <li className={stored?.pin ? "text-emerald-700" : "text-amber-700"}>
            PIN: {stored ? (stored.pin ? "set" : "not set") : "checking…"}
          </li>
          <li className={stored?.db ? "text-emerald-700" : "text-amber-700"}>
            Database connection: {stored ? (stored.db ? "saved" : "not saved") : "checking…"}
          </li>
          <li className={stored?.aiKey ? "text-emerald-700" : "text-gray-500"}>
            AI cloud key: {stored ? (stored.aiKey ? "saved" : "not saved") : "checking…"}
          </li>
        </ul>
        <button type="button" className="btn-ghost" onClick={() => void lockNow()}>
          Lock now
        </button>
      </section>

      <section className="space-y-3 card p-4">
        <div>
          <h2 className="text-sm font-medium">Change PIN</h2>
          <p className="text-sm text-gray-500">Requested every time the app starts.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="space-y-1">
            <label className="label" htmlFor="pin-current">
              Current PIN
            </label>
            <input
              id="pin-current"
              type="password"
              inputMode="numeric"
              autoComplete="current-password"
              className="input w-full"
              value={currentPin}
              onChange={(e) => setCurrentPin(e.currentTarget.value)}
            />
          </div>
          <div className="space-y-1">
            <label className="label" htmlFor="pin-new">
              New PIN
            </label>
            <input
              id="pin-new"
              type="password"
              inputMode="numeric"
              autoComplete="new-password"
              className="input w-full"
              value={newPin}
              onChange={(e) => setNewPin(e.currentTarget.value)}
            />
          </div>
          <div className="space-y-1">
            <label className="label" htmlFor="pin-confirm">
              Confirm new PIN
            </label>
            <input
              id="pin-confirm"
              type="password"
              inputMode="numeric"
              autoComplete="new-password"
              className="input w-full"
              value={confirmPin}
              onChange={(e) => setConfirmPin(e.currentTarget.value)}
            />
          </div>
        </div>
        {pinError && (
          <p role="alert" className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">
            {pinError}
          </p>
        )}
        {pinStatus && !pinError && (
          <p role="status" className="rounded bg-green-50 px-3 py-2 text-sm text-green-700">
            {pinStatus}
          </p>
        )}
        <button
          type="button"
          className="btn-primary"
          onClick={() => void changePin()}
          disabled={pinBusy}
        >
          Update PIN
        </button>
      </section>

      <section className="space-y-3 card p-4">
        <div>
          <h2 className="text-sm font-medium">Email (send bills)</h2>
          <p className="text-sm text-gray-500">
            Gmail SMTP + app password. Bills go out from your own address as HTML invoices.
          </p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <label className="label" htmlFor="email-from">From email</label>
            <input id="email-from" type="email" className="input w-full" value={emailCfg.fromEmail}
              onChange={(e) => setEmailCfg({ ...emailCfg, fromEmail: e.currentTarget.value })} />
          </div>
          <div className="space-y-1">
            <label className="label" htmlFor="email-name">Display name</label>
            <input id="email-name" className="input w-full" value={emailCfg.fromName}
              onChange={(e) => setEmailCfg({ ...emailCfg, fromName: e.currentTarget.value })} />
          </div>
          <div className="space-y-1">
            <label className="label" htmlFor="email-host">SMTP host</label>
            <input id="email-host" className="input w-full" value={emailCfg.host}
              onChange={(e) => setEmailCfg({ ...emailCfg, host: e.currentTarget.value })} />
          </div>
          <div className="space-y-1">
            <label className="label" htmlFor="email-port">Port</label>
            <input id="email-port" className="input w-full" value={emailCfg.port}
              onChange={(e) => setEmailCfg({ ...emailCfg, port: e.currentTarget.value })} />
          </div>
        </div>
        <div className="space-y-1">
          <label className="label" htmlFor="email-password">Gmail app password</label>
          <div className="flex gap-2">
            <input id="email-password" type="password" autoComplete="off" className="flex-1 input"
              placeholder={emailKeySaved ? "App password saved — enter a new one to replace" : "16-character app password"}
              value={emailKeyInput} onChange={(e) => setEmailKeyInput(e.currentTarget.value)} />
            <button type="button" className="btn-ghost" onClick={() => void saveEmailKey()}>Save password</button>
          </div>
        </div>
        {emailStatus && <p role="status" className="text-sm text-gray-600">{emailStatus}</p>}
        <div className="space-y-1">
          <label className="label" htmlFor="email-test-to">Send test to (optional)</label>
          <input id="email-test-to" type="email" className="input w-full" placeholder="Defaults to the From email"
            value={testTo} onChange={(e) => setTestTo(e.currentTarget.value)} />
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn-primary" onClick={() => void saveEmailCfg()}>Save email settings</button>
          <button type="button" className="btn-ghost" onClick={() => void sendTestEmail()}>Send test email</button>
        </div>
      </section>

      <section className="space-y-3 card p-4">
        <div>
          <h2 className="text-sm font-medium">Shop details</h2>
          <p className="text-sm text-gray-500">Printed on every GST bill.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <label className="label" htmlFor="shop-name">
              Shop name
            </label>
            <input
              id="shop-name"
              className="input w-full"
              value={shop.name}
              onChange={(e) => setShop({ ...shop, name: e.currentTarget.value })}
            />
          </div>
          <div className="space-y-1">
            <label className="label" htmlFor="shop-phone">
              Phone
            </label>
            <input
              id="shop-phone"
              className="input w-full"
              value={shop.phone}
              onChange={(e) => setShop({ ...shop, phone: e.currentTarget.value })}
            />
          </div>
          <div className="space-y-1">
            <label className="label" htmlFor="shop-address">
              Address
            </label>
            <input
              id="shop-address"
              className="input w-full"
              value={shop.address}
              onChange={(e) => setShop({ ...shop, address: e.currentTarget.value })}
            />
          </div>
          <div className="space-y-1">
            <label className="label" htmlFor="shop-gstin">
              GSTIN
            </label>
            <input
              id="shop-gstin"
              className="input w-full uppercase"
              value={shop.gstin}
              onChange={(e) => setShop({ ...shop, gstin: e.currentTarget.value })}
            />
          </div>
          <div className="space-y-1">
            <label className="label" htmlFor="shop-email">
              Email
            </label>
            <input
              id="shop-email"
              className="input w-full"
              value={shop.email}
              onChange={(e) => setShop({ ...shop, email: e.currentTarget.value })}
            />
          </div>
        </div>

        <p className="pt-1 text-[13px] font-medium text-stone-700">Bank details (printed on the bill)</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <label className="label" htmlFor="shop-bank-name">
              Bank name
            </label>
            <input
              id="shop-bank-name"
              className="input w-full"
              value={shop.bankName}
              onChange={(e) => setShop({ ...shop, bankName: e.currentTarget.value })}
            />
          </div>
          <div className="space-y-1">
            <label className="label" htmlFor="shop-bank-account">
              Account number
            </label>
            <input
              id="shop-bank-account"
              className="input w-full"
              value={shop.bankAccount}
              onChange={(e) => setShop({ ...shop, bankAccount: e.currentTarget.value })}
            />
          </div>
          <div className="space-y-1">
            <label className="label" htmlFor="shop-bank-ifsc">
              IFSC
            </label>
            <input
              id="shop-bank-ifsc"
              className="input w-full uppercase"
              value={shop.bankIfsc}
              onChange={(e) => setShop({ ...shop, bankIfsc: e.currentTarget.value })}
            />
          </div>
          <div className="space-y-1">
            <label className="label" htmlFor="shop-bank-branch">
              Branch
            </label>
            <input
              id="shop-bank-branch"
              className="input w-full"
              value={shop.bankBranch}
              onChange={(e) => setShop({ ...shop, bankBranch: e.currentTarget.value })}
            />
          </div>
        </div>
        {shopStatus && (
          <p role="status" className="rounded bg-green-50 px-3 py-2 text-sm text-green-700">
            {shopStatus}
          </p>
        )}
        <button type="button" className="btn-primary" onClick={() => void saveShop()}>
          Save shop details
        </button>
      </section>

      <section className="space-y-3 card p-4">
        <div>
          <h2 className="text-sm font-medium">Connection</h2>
          <p className="text-sm text-gray-500">
            Remove the saved database connection and PIN from this computer.
          </p>
        </div>
        <button
          type="button"
          className="rounded border border-red-300 px-3 py-1 text-sm text-red-700 hover:bg-red-50"
          onClick={() => setConfirming(true)}
        >
          Reset connection
        </button>
      </section>

      <section className="space-y-3 card p-4">
        <div>
          <h2 className="text-sm font-medium">AI assistant</h2>
          <p className="text-sm text-gray-500">
            Optional. The app always shows rule-based suggestions without it.
          </p>
        </div>

        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={ai.enabled}
            onChange={(e) => void persistAi({ ...ai, enabled: e.currentTarget.checked })}
          />
          Use AI
        </label>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="label" htmlFor="ai-mode">
              Mode
            </label>
            <select
              id="ai-mode"
              className="input w-full"
              value={ai.mode}
              onChange={(e) =>
                void persistAi({ ...ai, mode: e.currentTarget.value === "cloud" ? "cloud" : "local" })
              }
            >
              <option value="local">local (Ollama on this Mac)</option>
              <option value="cloud">cloud (ollama.com)</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="label" htmlFor="ai-model">
              Model
            </label>
            <input
              id="ai-model"
              className="input w-full"
              value={ai.model}
              onChange={(e) => setAi({ ...ai, model: e.currentTarget.value })}
              onBlur={() => void persistAi(ai)}
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="label" htmlFor="ai-key">
            Cloud API key
          </label>
          <div className="flex gap-2">
            <input
              id="ai-key"
              type="password"
              autoComplete="off"
              className="flex-1 input"
              placeholder={aiKeySaved ? "Key saved — enter a new one to replace" : "Ollama cloud key"}
              value={keyInput}
              onChange={(e) => setKeyInput(e.currentTarget.value)}
            />
            <button
              type="button"
              className="btn-ghost"
              onClick={() => void saveKey()}
            >
              Save key
            </button>
            {aiKeySaved && (
              <button
                type="button"
                className="btn-ghost text-red-700 hover:bg-red-50"
                onClick={() => void removeAiKey()}
              >
                Remove key
              </button>
            )}
          </div>
          {aiKeySaved && <p className="text-xs text-green-700">Key saved ✓</p>}
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            className="btn-ghost"
            onClick={() => void testAi()}
          >
            Test AI
          </button>
          {aiStatus && <span className="text-sm text-gray-600">{aiStatus}</span>}
        </div>
      </section>

      <p className="text-sm text-gray-500">More settings coming soon.</p>

      <section className="space-y-3 card p-4">
        <div>
          <h2 className="text-sm font-medium">Recent activity</h2>
          <p className="text-sm text-gray-500">
            Logins, locks and every change — stored in the database.
          </p>
        </div>
        {activity.length === 0 ? (
          <p className="text-sm text-gray-500">No activity recorded yet.</p>
        ) : (
          <ul className="divide-y divide-gray-100 text-sm">
            {activity.map((row) => (
              <li key={row.id} className="flex flex-wrap items-baseline justify-between gap-2 py-1.5">
                <span>{row.summary}</span>
                <span className="text-xs text-gray-500">
                  {new Date(row.at).toLocaleString()} · {row.actor}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="text-xs text-gray-400">Stock Tracker v{version ?? "—"}</p>

      {error && (
        <p role="alert" className="rounded bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      {confirming && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="reset-title"
          className="fixed inset-0 flex items-center justify-center bg-black/40 p-4"
        >
          <div className="w-full max-w-sm space-y-4 card p-5">
            <h2 id="reset-title" className="text-lg font-semibold">
              Reset connection?
            </h2>
            <p className="text-sm text-gray-600">
              This removes the saved database connection and PIN from this computer. Your data in
              the database is not deleted.
            </p>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="btn-ghost"
                onClick={() => setConfirming(false)}
                disabled={busy}
              >
                Cancel
              </button>
              <button
                type="button"
                className="rounded bg-red-600 px-3 py-1 text-sm font-medium text-white disabled:opacity-50"
                onClick={resetConnection}
                disabled={busy}
              >
                Yes, reset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
