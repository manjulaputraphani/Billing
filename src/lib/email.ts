import { invoke } from "@tauri-apps/api/core";

export type SendEmailInput = {
  host: string;
  port: number;
  username: string;
  password: string;
  fromEmail: string;
  fromName?: string;
  to: string;
  subject: string;
  html: string;
  attachmentPath?: string;
};

/** Send an email through the Rust SMTP command (Gmail app password from Keychain). */
export async function sendEmail(input: SendEmailInput): Promise<void> {
  await invoke("send_email", { input });
}

/** "Invoice SD-2026-000004 — SRI DURGA HARI HARA ENTERPRISES" */
export function billEmailSubject(billNo: string, shopName: string): string {
  const name = shopName.trim() || "Tax Invoice";
  return `Invoice ${billNo} — ${name}`;
}
