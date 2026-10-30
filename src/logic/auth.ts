/**
 * Login rules — PURE (docs/PLAN_LOGIN.md, L3).
 * Phone = Indian 10-digit (accepts +91 / 0 / spaces while typing).
 * Password = minimum 6 characters (approved policy).
 */

export type PhoneCheck = {
  phone: string;
  valid: boolean;
  reason: string | null;
};

export function normalizePhone(input: string): PhoneCheck {
  let digits = input.replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) digits = digits.slice(2);
  if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1);
  if (!digits) return { phone: digits, valid: false, reason: "Enter a phone number" };
  if (digits.length !== 10) {
    return { phone: digits, valid: false, reason: "Phone number must be 10 digits" };
  }
  if (!/^[6-9]/.test(digits)) {
    return { phone: digits, valid: false, reason: "Phone number must start with 6, 7, 8 or 9" };
  }
  return { phone: digits, valid: true, reason: null };
}

export type PasswordCheck = { valid: boolean; reason: string | null };

export const PASSWORD_MIN = 6;

export function validatePassword(password: string): PasswordCheck {
  if (password.length < PASSWORD_MIN) {
    return { valid: false, reason: `Password must be at least ${PASSWORD_MIN} characters` };
  }
  return { valid: true, reason: null };
}
