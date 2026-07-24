export const ALLOWED_LOGIN_DOMAIN = "ows.edu.ph";
export const ADMIN_LOGIN_EMAIL = "Guidance@ows.edu.ph";

export function normalizeLoginEmail(value) {
  return value.trim().toLowerCase();
}

export function isAllowedLoginEmail(value) {
  return normalizeLoginEmail(value).endsWith(`@${ALLOWED_LOGIN_DOMAIN}`);
}
