import { useEffect, useState } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, GraduationCap, Mail, Lock, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../firebase";
import { isAllowedLoginEmail, normalizeLoginEmail } from "../authPolicy";
import { isRoleProfileForLoginType, isValidRoleProfile } from "../schoolScope";
import {
  ACTIVITY_ACTIONS,
  FAILED_LOGIN_REASONS,
  recordActivity,
  reportFailedLogin,
} from "../activityLog";
import { useAuthProfile } from "../authContext";
import { IDLE_TIMEOUT_MS, SESSION_EXPIRED_KEY } from "../session";
import heroImg from "../assets/hero.png";
import wesleyLogo from "../assets/wesley-logo.png";
import saresLogo from "../assets/sares-logo.png";
import "../css/Login.css";

const IDLE_TIMEOUT_MINUTES = Math.round(IDLE_TIMEOUT_MS / 60000);
const ACCOUNT_TYPES = ["elementary", "high_school", "superadmin"];

const LOGIN_MESSAGES = {
  invalidCredentials: "Invalid email or password.",
  rateLimited: "Too many failed sign-in attempts. Please wait a few minutes before trying again, or contact the system administrator.",
  accountDisabled: "This account has been disabled. Contact the system administrator.",
  network: "Unable to reach the server. Check your internet connection and try again.",
  notProvisioned: "This account is not provisioned for SARES. Contact the system administrator.",
  wrongAccountType: "This account does not match the selected sign-in. Choose the account type assigned to you.",
  unexpected: "Sign-in failed due to an unexpected error. Please try again.",
};

// Thrown inside handleLogin to carry a failure reason to the single catch block.
class LoginFailure extends Error {
  constructor(reason, message) {
    super(message);
    this.reason = reason;
  }
}

// Maps Firebase Auth / Firestore errors to a failure reason and a user-facing message.
// Credential errors share one message so the page does not reveal which accounts exist.
function classifyLoginError(error) {
  if (error instanceof LoginFailure) {
    return { reason: error.reason, message: error.message };
  }
  switch (error?.code) {
    case "auth/invalid-credential":
    case "auth/invalid-login-credentials":
    case "auth/wrong-password":
    case "auth/user-not-found":
    case "auth/invalid-email":
      return { reason: FAILED_LOGIN_REASONS.INVALID_CREDENTIALS, message: LOGIN_MESSAGES.invalidCredentials };
    case "auth/too-many-requests":
      return { reason: FAILED_LOGIN_REASONS.RATE_LIMITED, message: LOGIN_MESSAGES.rateLimited };
    case "auth/user-disabled":
      return { reason: FAILED_LOGIN_REASONS.ACCOUNT_DISABLED, message: LOGIN_MESSAGES.accountDisabled };
    case "auth/network-request-failed":
    case "unavailable":
      // Not reported: the logging endpoint is unreachable too, and the attempt never reached a verdict.
      return { reason: null, message: LOGIN_MESSAGES.network };
    case "permission-denied":
      // Firestore rules only allow reading users/{uid} when the profile is valid and provisioned.
      return { reason: FAILED_LOGIN_REASONS.NOT_PROVISIONED, message: LOGIN_MESSAGES.notProvisioned };
    default:
      return { reason: FAILED_LOGIN_REASONS.UNKNOWN_ERROR, message: LOGIN_MESSAGES.unexpected };
  }
}

function Login() {
  const { userProfile, authReady } = useAuthProfile();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialAccountType = searchParams.get("type");
  const [selectedAccountType, setSelectedAccountType] = useState(
    ACCOUNT_TYPES.includes(initialAccountType)
      ? initialAccountType
      : ""
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [error, setError] = useState("");
  const [sessionExpired] = useState(() => {
    try {
      const expired = sessionStorage.getItem(SESSION_EXPIRED_KEY) === "1";
      sessionStorage.removeItem(SESSION_EXPIRED_KEY);
      return expired;
    } catch {
      return false;
    }
  });
  const [loading, setLoading] = useState(false);
  const [acceptedPolicies, setAcceptedPolicies] = useState(false);
  const [showPolicyHint, setShowPolicyHint] = useState(false);
  const [isPolicyModalOpen, setIsPolicyModalOpen] = useState(false);
  const [activePolicyTab, setActivePolicyTab] = useState("privacy");

  const navigate = useNavigate();

  useEffect(() => {
    if (!isPolicyModalOpen) return undefined;

    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        setIsPolicyModalOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isPolicyModalOpen]);

  const handleLogin = async (event) => {
    event.preventDefault();

    const hasCredentials = email.trim() && password;

    if (!acceptedPolicies) {
      setShowPolicyHint(Boolean(hasCredentials));
      setError(
        hasCredentials
          ? "You must agree to the Privacy Policy and Terms of Use before logging in."
          : ""
      );
      return;
    }

    setShowPolicyHint(false);
    setError("");
    setLoading(true);

    const normalizedEmail = normalizeLoginEmail(email);
    let idToken = "";

    try {
      if (!isAllowedLoginEmail(normalizedEmail)) {
        throw new LoginFailure(FAILED_LOGIN_REASONS.DOMAIN_NOT_ALLOWED, LOGIN_MESSAGES.invalidCredentials);
      }

      const credential = await signInWithEmailAndPassword(auth, normalizedEmail, password);
      const firebaseUser = credential.user;
      // Kept so the failure logger can verify who this was if a later check fails.
      idToken = await firebaseUser.getIdToken().catch(() => "");

      if (!isAllowedLoginEmail(firebaseUser.email || "")) {
        throw new LoginFailure(FAILED_LOGIN_REASONS.DOMAIN_NOT_ALLOWED, LOGIN_MESSAGES.invalidCredentials);
      }

      const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));
      const userData = userDoc.exists() ? userDoc.data() : null;
      if (!userData || !isValidRoleProfile(userData)) {
        throw new LoginFailure(FAILED_LOGIN_REASONS.NOT_PROVISIONED, LOGIN_MESSAGES.notProvisioned);
      }

      if (!isRoleProfileForLoginType(userData, selectedAccountType)) {
        throw new LoginFailure(FAILED_LOGIN_REASONS.WRONG_ACCOUNT_TYPE, LOGIN_MESSAGES.wrongAccountType);
      }

      await recordActivity(userData, ACTIVITY_ACTIONS.LOGIN_SUCCESS, "session");
      navigate("/sares/dashboard");
    } catch (loginError) {
      const { reason, message } = classifyLoginError(loginError);
      if (!(loginError instanceof LoginFailure)) {
        console.error("Login error:", loginError);
      }

      // Never leave a half-validated session behind.
      if (auth.currentUser) {
        await signOut(auth).catch(() => {});
      }

      if (reason) {
        reportFailedLogin({
          email: normalizedEmail,
          reason,
          accountType: selectedAccountType,
          idToken,
        });
      }
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleChooseDifferentType = () => {
    setSelectedAccountType("");
    setSearchParams({}, { replace: true });
    setError("");
    setShowPolicyHint(false);
  };

  // Already signed in (e.g. pressed Back from the dashboard): return to the app instead of
  // silently signing out. Skipped while a sign-in is being validated on this page.
  if (authReady && userProfile && !loading) {
    return <Navigate to="/sares/dashboard" replace />;
  }

  return (
    <div className="app-shell">
      <section
        className="hero-panel"
        style={{ backgroundImage: `url(${heroImg})` }}
      >
        <div className="hero-overlay" />

        <div className="hero-branding">
          <div className="hero-logos">
            <img
              src={wesleyLogo}
              alt="Olongapo Wesley School seal"
              className="hero-logo hero-logo--wesley"
            />
            <img
              src={saresLogo}
              alt="SARES logo"
              className="hero-logo hero-logo--sares"
            />
          </div>
          <h1 className="hero-system-title">
            <span>Sanction Recommendation</span>
            <span>System</span>
          </h1>
        </div>
      </section>

      <main className="login-panel">
        <div className="login-card">
          <header className="login-header">
            <h2>{selectedAccountType ? "Welcome Back!" : "Sign in to SARES"}</h2>
            <p>
              {selectedAccountType === "elementary"
                ? "Elementary counselor account"
                : selectedAccountType === "high_school"
                  ? "High school counselor account"
                  : selectedAccountType === "superadmin"
                    ? "Restricted superadmin access"
                    : "Choose your account type to continue"}
            </p>
          </header>

          {sessionExpired && (
            <p className="login-notice" role="status">
              You were signed out after {IDLE_TIMEOUT_MINUTES} minutes of inactivity. Please sign in again.
            </p>
          )}

          {!selectedAccountType ? (
            <div className="account-type-options" role="group" aria-label="Choose account type">
              <button
                type="button"
                className="account-type-option"
                onClick={() => setSelectedAccountType("elementary")}
              >
                <GraduationCap aria-hidden="true" />
                <span>
                  <strong>Elementary Counselor</strong>
                  <small>Sign in to the elementary school workspace</small>
                </span>
              </button>
              <button
                type="button"
                className="account-type-option"
                onClick={() => setSelectedAccountType("high_school")}
              >
                <GraduationCap aria-hidden="true" />
                <span>
                  <strong>High School Counselor</strong>
                  <small>Sign in to the high school workspace</small>
                </span>
              </button>
              <button
                type="button"
                className="superadmin-entry"
                onClick={() => setSelectedAccountType("superadmin")}
              >
                <ShieldCheck aria-hidden="true" />
                <span>
                  <strong>Admin sign-in</strong>
                  <small>For authorized administrators only</small>
                </span>
              </button>
            </div>
          ) : (
            <>
              <button
                type="button"
                className="login-back-button"
                onClick={handleChooseDifferentType}
              >
                <ArrowLeft aria-hidden="true" size={16} />
                Choose a different account type
              </button>
              <form className="login-form" onSubmit={handleLogin}>
                <label className="form-field">
                  <span>Email Address</span>

                  <div className="input-group">
                    <span className="input-icon" aria-hidden="true">
                      <Mail className="input-icon-svg" strokeWidth={2} />
                    </span>

                    <input
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      placeholder="Email"
                      className="input-field"
                      autoComplete="username"
                      required
                    />
                  </div>
                </label>

                <label className="form-field">
                  <span>Password</span>

                  <div className="input-group">
                    <span className="input-icon" aria-hidden="true">
                      <Lock className="input-icon-svg" strokeWidth={2} />
                    </span>

                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="Password"
                      className="input-field input-field--with-toggle"
                      autoComplete="current-password"
                      required
                    />

                    <button
                      type="button"
                      className="input-password-toggle"
                      onClick={() => setShowPassword((previous) => !previous)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? (
                        <EyeOff className="input-icon-svg" strokeWidth={2} aria-hidden="true" />
                      ) : (
                        <Eye className="input-icon-svg" strokeWidth={2} aria-hidden="true" />
                      )}
                    </button>
                  </div>
                </label>

                {error && <p className="login-error" role="alert">{error}</p>}

                <label className="privacy-check">
                  <input
                    type="checkbox"
                    checked={acceptedPolicies}
                    onChange={(event) => {
                      const checked = event.target.checked;
                      setAcceptedPolicies(checked);
                      if (checked) {
                        setShowPolicyHint(false);
                      }
                    }}
                  />
                  <span>
                    I have read and agree to the{" "}
                    <button
                      type="button"
                      className="privacy-link"
                      onClick={() => {
                        setActivePolicyTab("privacy");
                        setIsPolicyModalOpen(true);
                      }}
                    >
                      Privacy Policy
                    </button>{" "}
                    and{" "}
                    <button
                      type="button"
                      className="privacy-link"
                      onClick={() => {
                        setActivePolicyTab("terms");
                        setIsPolicyModalOpen(true);
                      }}
                    >
                      Terms of Use
                    </button>
                    .
                  </span>
                </label>
                {!acceptedPolicies && showPolicyHint && (
                  <p className="privacy-hint">Please agree to the policy to continue.</p>
                )}

                <button type="submit" className="login-button" disabled={loading}>
                  {loading ? "Logging in..." : "Login"}
                </button>
              </form>
            </>
          )}
        </div>
      </main>

      {isPolicyModalOpen && (
        <div
          className="policy-modal-backdrop"
          onClick={() => setIsPolicyModalOpen(false)}
          role="presentation"
        >
          <section
            className="policy-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="policy-modal-title"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="policy-modal-header">
              <h3 id="policy-modal-title">SARES Legal Documents</h3>
              <button
                type="button"
                className="policy-modal-close"
                onClick={() => setIsPolicyModalOpen(false)}
                aria-label="Close legal documents"
              >
                ×
              </button>
            </header>

            <div className="policy-tabs" role="tablist" aria-label="Legal document tabs">
              <button
                type="button"
                role="tab"
                aria-selected={activePolicyTab === "privacy"}
                className={`policy-tab${activePolicyTab === "privacy" ? " policy-tab--active" : ""}`}
                onClick={() => setActivePolicyTab("privacy")}
              >
                Privacy Policy
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activePolicyTab === "terms"}
                className={`policy-tab${activePolicyTab === "terms" ? " policy-tab--active" : ""}`}
                onClick={() => setActivePolicyTab("terms")}
              >
                Terms of Use
              </button>
            </div>

            <div className="policy-modal-content">
              {activePolicyTab === "privacy" ? (
                <>
                  <h4>Privacy Policy</h4>
                  <p>
                    Olongapo Wesley School ("the School," "we," or "us") operates the
                    Sanction Recommendation System ("SARES") as a personal information
                    controller under Republic Act No. 10173, the Data Privacy Act of 2012,
                    its Implementing Rules and Regulations, and issuances of the National
                    Privacy Commission ("NPC"). This Privacy Policy explains what personal
                    data SARES processes, why it is processed, who may access it, and the
                    rights of the persons it concerns.
                  </p>

                  <h5>1. Scope</h5>
                  <p>
                    This Policy covers personal data processed through SARES, which is used
                    by authorized School personnel to document student conduct incidents,
                    assess cases against the Student Handbook, recommend sanctions, track
                    case resolution, and prepare reports. It applies to two groups of data
                    subjects: (a) School personnel who hold SARES accounts, and (b) students,
                    and where relevant their parents or guardians, whose records are
                    maintained in SARES. Students and parents do not use SARES directly.
                  </p>

                  <h5>2. Personal Data We Process</h5>
                  <ul>
                    <li>
                      <strong>Account data:</strong> name, School email address, assigned role,
                      department or school level, and account status.
                    </li>
                    <li>
                      <strong>Student records:</strong> name, student number, grade or year level,
                      section, and other enrollment details needed to identify the student.
                    </li>
                    <li>
                      <strong>Case records:</strong> incident date, location, and narrative;
                      the offense classified; offense history and repeat-offense counts;
                      recommended and approved sanctions; case status; counselor notes; and
                      records of parent or guardian notification, conferences, and commitments.
                    </li>
                    <li>
                      <strong>Evidence files:</strong> photos, documents, or other files
                      attached to a case by authorized personnel.
                    </li>
                    <li>
                      <strong>Security and audit data:</strong> sign-in activity, including
                      failed sign-in attempts with the email address entered and the
                      originating IP address; and logs of record creation, changes, and
                      deletions, with the responsible account and time.
                    </li>
                  </ul>
                  <p>
                    Student disciplinary records are treated as confidential. Where they
                    concern minors, they receive the heightened care described in Section 8.
                  </p>

                  <h5>3. Purposes and Lawful Basis</h5>
                  <p>Personal data is processed only to:</p>
                  <ul>
                    <li>authenticate personnel and restrict access according to role;</li>
                    <li>record incidents and apply the Student Handbook consistently;</li>
                    <li>track offense history, escalation, sanctions, and parent involvement;</li>
                    <li>produce incident reports, forms, and statistical summaries for School administration;</li>
                    <li>protect the security and integrity of the system and its records.</li>
                  </ul>
                  <p>
                    This processing is necessary for the School to carry out its responsibilities
                    for student discipline, welfare, and campus safety under applicable education
                    laws and regulations, and for the School's legitimate interests in orderly and
                    fair administration. Student and parent data is not processed on the basis of
                    staff consent; the acknowledgment given at sign-in confirms that personnel
                    have read and will follow this Policy and the Terms of Use.
                  </p>

                  <h5>4. AI-Assisted Features</h5>
                  <p>
                    Some optional features, such as offense classification suggestions,
                    counselor recommendations, and prevention suggestions, send case text to
                    Google's Gemini service for processing. Before an incident narrative is
                    sent, SARES automatically removes the names of students linked to the
                    case. Personnel should not enter other identifying details (such as
                    student numbers, addresses, or names of other individuals) into fields
                    used for AI assistance. AI output is advisory only, is reviewed by a
                    person, and is never used on its own to decide a sanction.
                  </p>

                  <h5>5. Who Can Access the Data</h5>
                  <p>
                    Access is limited to School personnel whose duties require it, and is
                    restricted by role and school level. Personal data is not sold, rented,
                    or used for marketing. The School uses the following service providers
                    to operate SARES, under their respective data protection terms:
                  </p>
                  <ul>
                    <li>Google Firebase (authentication, database, and file storage);</li>
                    <li>Google Gemini (optional AI-assisted features, as described in Section 4);</li>
                    <li>Vercel (web hosting and server functions).</li>
                  </ul>
                  <p>
                    These providers may store or process data on servers outside the
                    Philippines. Data may otherwise be disclosed only when required by law,
                    a court or other competent authority, or when necessary to protect the
                    life, health, or safety of a student or other person.
                  </p>

                  <h5>6. Security Measures</h5>
                  <p>
                    The School applies organizational, physical, and technical safeguards,
                    including encrypted connections, School-domain sign-in, role-based access
                    rules enforced on the server, automatic sign-out after 30 minutes of
                    inactivity, and audit logging. Records exported as PDF or spreadsheet
                    files leave these controls; personnel who download, print, or share them
                    are responsible for keeping them secure. No system is completely secure,
                    and the School will notify affected data subjects and the NPC of personal
                    data breaches as required by law.
                  </p>

                  <h5>7. Retention and Disposal</h5>
                  <p>
                    Records are kept only as long as needed for the purposes above and as
                    required by the School's records retention policy and applicable
                    regulations. Records that are no longer needed are archived, anonymized,
                    or securely deleted. Account data of personnel who leave the School is
                    deactivated, while audit entries tied to their past actions may be kept
                    to preserve accountability.
                  </p>

                  <h5>8. Records of Minors</h5>
                  <p>
                    Many students in SARES are minors. Their records are used strictly for
                    discipline, guidance, and student support; are viewed only by personnel
                    with a direct role in the case; and are shared with parents or guardians
                    in line with School procedures. Parents or guardians may exercise the
                    rights in Section 9 on behalf of a minor student.
                  </p>

                  <h5>9. Your Rights</h5>
                  <p>
                    Subject to the Data Privacy Act and its limitations, data subjects have
                    the right to be informed; to access their personal data; to have
                    inaccurate or incomplete data corrected; to object to processing or
                    request erasure or blocking where the law allows; to data portability;
                    to be indemnified for damages from unlawful processing; and to file a
                    complaint with the National Privacy Commission. Requests to correct or
                    remove disciplinary records are reviewed under the School's procedures,
                    and some records may be retained where required by law or policy.
                  </p>

                  <h5>10. Changes to This Policy</h5>
                  <p>
                    The School may update this Policy to reflect changes in law, School
                    procedures, or the system. Significant changes will be communicated to
                    SARES users.
                  </p>

                  <h5>11. Contact</h5>
                  <p>
                    For questions, requests, or concerns regarding personal data in SARES,
                    contact:<br />
                    <strong>Administrator's Office, Olongapo Wesley School</strong><br />
                    890 Rizal Avenue Extension, East Tapinac, Olongapo City, 2200 Zambales<br />
                    <strong>Email:</strong> admin@ows.edu.ph
                  </p>
                </>
              ) : (
                <>
                  <h4>Terms of Use</h4>
                  <p>
                    These Terms of Use ("Terms") govern access to and use of the Sanction
                    Recommendation System ("SARES") operated by Olongapo Wesley School
                    ("the School"). By signing in, you confirm that you have read and agree
                    to these Terms, the SARES Privacy Policy, and the School's applicable
                    policies.
                  </p>

                  <h5>1. Authorized Users</h5>
                  <p>
                    SARES is available only to School personnel who have been issued an
                    account for official duties in student affairs, guidance, or discipline
                    administration. Accounts are personal and are provisioned, changed, or
                    deactivated by the School. Access ends automatically when your role no
                    longer requires it or your employment ends.
                  </p>

                  <h5>2. Account Security</h5>
                  <ul>
                    <li>Keep your credentials confidential and do not share your account.</li>
                    <li>Sign out after use, especially on shared or public devices.</li>
                    <li>Report any suspected unauthorized access or data breach to the Administrator's Office immediately.</li>
                  </ul>
                  <p>Activity performed under your account is attributed to you in the audit logs.</p>

                  <h5>3. Acceptable Use</h5>
                  <p>You may use SARES only to:</p>
                  <ul>
                    <li>record and manage student conduct incidents within your assigned scope;</li>
                    <li>review handbook-based assessments and sanction recommendations;</li>
                    <li>document case actions, parent involvement, and resolutions;</li>
                    <li>prepare reports and forms for official School purposes.</li>
                  </ul>

                  <h5>4. Prohibited Conduct</h5>
                  <p>You must not:</p>
                  <ul>
                    <li>access, or attempt to access, records outside your role or school level;</li>
                    <li>enter false, misleading, or unnecessary information, or alter records without proper basis;</li>
                    <li>disclose student information to anyone not authorized to receive it;</li>
                    <li>copy, export, or retain records for personal or non-School purposes;</li>
                    <li>enter identifying details into AI-assisted fields beyond what the feature requires;</li>
                    <li>interfere with the security, integrity, or availability of the system.</li>
                  </ul>

                  <h5>5. Recommendations Are Advisory</h5>
                  <p>
                    SARES recommendations, including handbook-based sanctions and AI-generated
                    suggestions, are decision-support tools only. They can be incomplete or
                    wrong, and they do not replace professional judgment. Every disciplinary
                    decision must be made and approved by authorized School personnel in
                    accordance with the Student Handbook and due process, including giving the
                    student a fair opportunity to be heard.
                  </p>

                  <h5>6. Accuracy and Records</h5>
                  <p>
                    You are responsible for the accuracy, completeness, and timeliness of the
                    entries you make. Records and uploaded evidence are School property and
                    official records. Exported or printed copies must be handled under the
                    same confidentiality obligations as the system itself.
                  </p>

                  <h5>7. Monitoring and Audit</h5>
                  <p>
                    The School logs sign-in activity and changes to records, and may review
                    these logs to maintain security, verify compliance with these Terms, and
                    investigate irregularities.
                  </p>

                  <h5>8. Violations</h5>
                  <p>
                    The School may suspend or revoke access to protect the system or its data,
                    or when these Terms are violated. Misuse may also result in administrative
                    action under School employment policies and, where applicable, liability
                    under the Data Privacy Act of 2012 and other laws.
                  </p>

                  <h5>9. Availability</h5>
                  <p>
                    The School aims to keep SARES available and reliable but does not guarantee
                    uninterrupted or error-free operation. Maintenance, network issues, or
                    third-party service outages may affect access. Keep essential case
                    information available through the School's regular procedures in case the
                    system is unavailable.
                  </p>

                  <h5>10. Governing Law</h5>
                  <p>
                    These Terms are governed by the laws of the Republic of the Philippines.
                    Concerns about the use of SARES should first be raised with the School
                    administration for resolution under internal procedures.
                  </p>

                  <h5>11. Changes to These Terms</h5>
                  <p>
                    The School may revise these Terms when needed. Continued use of SARES
                    after a revision means you accept the revised Terms.
                  </p>

                  <h5>12. Contact</h5>
                  <p>
                    Questions about these Terms may be directed to the Administrator's Office,
                    Olongapo Wesley School, 890 Rizal Avenue Extension, East Tapinac,
                    Olongapo City, 2200 Zambales, or by email at admin@ows.edu.ph.
                  </p>
                </>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

export default Login;
