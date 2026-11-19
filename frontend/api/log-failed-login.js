import process from "node:process";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore } from "firebase-admin/firestore";

// Records failed SARES sign-in attempts in activity_logs.
//
// This runs server-side because a failed sign-in has no Firebase session, and the
// Firestore rules (correctly) refuse unauthenticated writes. The Admin SDK bypasses
// the rules, so this handler validates and bounds every field itself.
//
// Required environment variable (Vercel → Project → Settings → Environment Variables):
//   FIREBASE_SERVICE_ACCOUNT  the full JSON of a service account key for the project

const ALLOWED_REASONS = new Set([
  "invalid_credentials",
  "domain_not_allowed",
  "rate_limited",
  "account_disabled",
  "not_provisioned",
  "wrong_account_type",
  "unknown_error",
]);

// The account type picked on the login page decides which school scope the
// attempt is filed under in System Logs ("all" is shown as Admin).
const ACCOUNT_TYPE_SCOPES = {
  elementary: "elementary",
  high_school: "high_school",
  superadmin: "all",
};

// Best-effort, per-instance throttle so one client cannot flood the log.
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX_PER_WINDOW = 15;
const recentRequestsByIp = new Map();

function isRateLimited(ip) {
  const now = Date.now();
  for (const [key, timestamps] of recentRequestsByIp) {
    const fresh = timestamps.filter((time) => now - time < RATE_LIMIT_WINDOW_MS);
    if (fresh.length) recentRequestsByIp.set(key, fresh);
    else recentRequestsByIp.delete(key);
  }
  const timestamps = recentRequestsByIp.get(ip) || [];
  if (timestamps.length >= RATE_LIMIT_MAX_PER_WINDOW) return true;
  timestamps.push(now);
  recentRequestsByIp.set(ip, timestamps);
  return false;
}

function getAdminApp() {
  if (getApps().length) return getApps()[0];
  const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!serviceAccountJson) return null;
  return initializeApp({ credential: cert(JSON.parse(serviceAccountJson)) });
}

function getClientIp(req) {
  const forwarded = String(req.headers?.["x-forwarded-for"] || "").split(",")[0].trim();
  return (forwarded || req.headers?.["x-real-ip"] || req.socket?.remoteAddress || "unknown")
    .toString()
    .slice(0, 64);
}

function cleanEmail(value) {
  const email = String(value || "").trim().toLowerCase().slice(0, 254);
  return /^[^\s@]+@[^\s@]+$/.test(email) ? email : "";
}

function parseBody(req) {
  if (req.body && typeof req.body === "object") return req.body;
  try {
    return JSON.parse(String(req.body || "{}"));
  } catch {
    return {};
  }
}

// When the password was correct but a later check failed (not provisioned, wrong
// account type), the client sends its ID token so the entry names the real account.
async function verifyCaller(req, adminApp) {
  const authorization = String(req.headers?.authorization || "");
  if (!authorization.startsWith("Bearer ")) return null;
  try {
    const decoded = await getAuth(adminApp).verifyIdToken(authorization.slice(7));
    return { uid: decoded.uid, email: cleanEmail(decoded.email) };
  } catch {
    return null;
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const ip = getClientIp(req);
  if (isRateLimited(ip)) {
    return res.status(429).json({ error: "Too many requests" });
  }

  const body = parseBody(req);
  const reason = String(body.reason || "");
  if (!ALLOWED_REASONS.has(reason)) {
    return res.status(400).json({ error: "Invalid reason" });
  }

  let adminApp;
  try {
    adminApp = getAdminApp();
  } catch (error) {
    console.error("Failed-login logger: invalid FIREBASE_SERVICE_ACCOUNT:", error.message);
    return res.status(500).json({ error: "Logger not configured" });
  }
  if (!adminApp) {
    console.error("Failed-login logger: FIREBASE_SERVICE_ACCOUNT is not set.");
    return res.status(500).json({ error: "Logger not configured" });
  }

  const verifiedCaller = await verifyCaller(req, adminApp);
  const attemptedEmail = cleanEmail(body.email);

  try {
    await getFirestore(adminApp).collection("activity_logs").add({
      action: "login_failed",
      actor_uid: verifiedCaller?.uid || "",
      actor_email: verifiedCaller?.email || attemptedEmail,
      actor_role: "",
      school_scope: ACCOUNT_TYPE_SCOPES[body.account_type] || "shared",
      target_type: "session",
      target_id: reason,
      source: "server",
      identity_verified: Boolean(verifiedCaller),
      ip_address: ip,
      user_agent: String(req.headers?.["user-agent"] || "").slice(0, 300),
      created_at: FieldValue.serverTimestamp(),
    });
  } catch (error) {
    console.error("Failed-login logger: could not write activity log:", error);
    return res.status(500).json({ error: "Could not record attempt" });
  }

  return res.status(204).end();
}
