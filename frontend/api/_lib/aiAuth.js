import process from "node:process";

export async function authenticateRequest(req) {
  const authorization = req.headers?.authorization || req.headers?.Authorization || "";
  const idToken = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  const apiKey = process.env.FIREBASE_WEB_API_KEY;
  if (!idToken || !apiKey) return null;

  const lookupResponse = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${encodeURIComponent(apiKey)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
    }
  );
  if (!lookupResponse.ok) return null;

  const lookupData = await lookupResponse.json();
  const authenticatedUser = lookupData?.users?.[0];
  if (!authenticatedUser?.localId || !authenticatedUser.email) return null;
  if (!authenticatedUser.email.toLowerCase().endsWith("@ows.edu.ph")) return null;

  const projectId = process.env.FIREBASE_PROJECT_ID || "sares-system";
  const profileResponse = await fetch(
    `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(projectId)}/databases/(default)/documents/users/${encodeURIComponent(authenticatedUser.localId)}`,
    { headers: { Authorization: `Bearer ${idToken}` } }
  );
  if (!profileResponse.ok) return null;

  const profileData = await profileResponse.json();
  const role = profileData?.fields?.role?.stringValue;
  const schoolScope = profileData?.fields?.school_scope?.stringValue;
  const validProfile = (role === "superadmin" && schoolScope === "all")
    || (role === "counselor" && ["elementary", "high_school"].includes(schoolScope));
  return validProfile ? authenticatedUser : null;
}

export function getGeminiErrorMessage(data) {
  const message = typeof data?.error?.message === "string"
    ? data.error.message
    : "";
  return message.replace(/[\r\n]+/g, " ").slice(0, 300);
}
