export const ALLOWED_LOGIN_DOMAIN = "ows.edu.ph";

export function normalizeLoginEmail(value) {
  return String(value || "").trim().toLowerCase();
}

export function isAllowedLoginEmail(value) {
  const email = normalizeLoginEmail(value);
  return /^[^\s@]+@ows\.edu\.ph$/.test(email);
}
