import { formatRupees } from "../logic/units";

/** Normalise a phone for wa.me — digits with country code; a 10-digit Indian mobile gets +91.
 *  Returns null when the number is unusable. */
export function waPhone(phone: string | null | undefined): string | null {
  let digits = (phone ?? "").replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2); // international 00 prefix
  if (digits.length === 10 && !digits.startsWith("0")) return `91${digits}`;
  if (digits.length === 11 && digits.startsWith("0")) return `91${digits.slice(1)}`;
  if (digits.length >= 11 && digits.length <= 15) return digits; // country code already included
  return null;
}

/** Short bill summary typed into the WhatsApp chat. Money stays in integer paise. */
export function billWhatsAppText(
  bill: { billNo: string; saleDate: string; totalPaise: number; paidPaise: number },
  shopName: string,
): string {
  const credit = bill.paidPaise < bill.totalPaise ? bill.totalPaise - bill.paidPaise : 0;
  return [
    `Tax Invoice ${bill.billNo} — ${shopName.trim() || "Tax Invoice"}`,
    `Date: ${bill.saleDate}`,
    `Total: ${formatRupees(bill.totalPaise)}`,
    ...(credit > 0 ? [`Credit due: ${formatRupees(credit)}`] : []),
    "Thank you for your business.",
  ].join("\n");
}

/** wa.me chat link with the text pre-filled, or null when the phone is unusable. */
export function buildWhatsAppLink(phone: string | null | undefined, text: string): string | null {
  const to = waPhone(phone);
  if (!to) return null;
  return `https://wa.me/${to}?text=${encodeURIComponent(text)}`;
}