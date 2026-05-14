import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";
import { signInWithEmailAndPassword, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "../firebase";
import heroImg from "../assets/hero.png";
import wesleyLogo from "../assets/wesley-logo.png";
import saresLogo from "../assets/sares-logo.png";
import "../css/Login.css";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [acceptedPolicies, setAcceptedPolicies] = useState(false);
  const [isPolicyModalOpen, setIsPolicyModalOpen] = useState(false);
  const [activePolicyTab, setActivePolicyTab] = useState("privacy");

  const navigate = useNavigate();

  useEffect(() => {
    signOut(auth).catch(() => {
      // Best-effort sign out to prevent stale sessions on the login screen.
    });
    localStorage.removeItem("user");
  }, []);

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

    if (!acceptedPolicies) {
      setError("You must agree to the Privacy Policy and Terms of Use before logging in.");
      return;
    }

    setError("");
    setLoading(true);

    try {
      const credential = await signInWithEmailAndPassword(auth, email, password);
      const firebaseUser = credential.user;

      let userPayload = {
        user_id: firebaseUser.uid,
        full_name: firebaseUser.displayName || "Firebase User",
        email: firebaseUser.email || email,
        role: "admin",
      };

      const userDocRef = doc(db, "users", firebaseUser.uid);
      const userDoc = await getDoc(userDocRef);

      if (userDoc.exists()) {
        const userData = userDoc.data();
        userPayload = {
          user_id: userData.user_id || firebaseUser.uid,
          full_name: userData.full_name || firebaseUser.displayName || "Firebase User",
          email: userData.email || firebaseUser.email || email,
          role: userData.role || "admin",
        };
      }

      localStorage.setItem("user", JSON.stringify(userPayload));

      navigate("/sares/dashboard");
    } catch (error) {
      console.error("Login error:", error);
      setError("Invalid email or password.");
    } finally {
      setLoading(false);
    }
  };

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
            <h2>Welcome Back!</h2>
            <p>Sign in to your admin account</p>
          </header>

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
                  placeholder="email@domain.com"
                  className="input-field"
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

            {error && <p className="login-error">{error}</p>}

            <label className="privacy-check">
              <input
                type="checkbox"
                checked={acceptedPolicies}
                onChange={(event) => setAcceptedPolicies(event.target.checked)}
                required
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
            {!acceptedPolicies && (
              <p className="privacy-hint">Please agree to the policy to continue.</p>
            )}

            <button type="submit" className="login-button" disabled={loading || !acceptedPolicies}>
              {loading ? "Logging in..." : "Login"}
            </button>
          </form>
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
                  <p><strong>Effective Date:</strong> May 14, 2026</p>
                  <p>
                    This Privacy Policy explains how Olongapo Wesley School ("the School"),
                    as operator of the Sanction Recommendation System (SARES), collects,
                    uses, stores, and protects personal data processed through the system.
                    SARES is intended for authorized school staff supporting student affairs,
                    guidance, and disciplinary administration.
                  </p>

                  <h5>1. Scope and Purpose</h5>
                  <p>
                    SARES is used to support consistent disciplinary case assessment,
                    sanction recommendation, case documentation, and reporting in accordance
                    with the School's handbook and institutional policies.
                  </p>

                  <h5>2. Personal Data Processed</h5>
                  <p>SARES may process the following categories of data:</p>
                  <ul>
                    <li>Staff account information, such as name, role, and login email.</li>
                    <li>Student profile information, such as student identifiers and class details.</li>
                    <li>Violation and case records, including incident details and sanction recommendations.</li>
                    <li>System and audit records, such as activity logs and case-change history.</li>
                  </ul>

                  <h5>3. Legal and Institutional Basis</h5>
                  <p>
                    Processing is undertaken for legitimate institutional functions of
                    student discipline management, campus safety, policy enforcement, and
                    internal records administration under applicable Philippine laws and
                    school governance requirements.
                  </p>

                  <h5>4. How Data Is Used</h5>
                  <p>Data is used to:</p>
                  <ul>
                    <li>Authenticate authorized staff and control access.</li>
                    <li>Record incidents and evaluate sanction recommendations.</li>
                    <li>Track case history, escalations, and outcomes.</li>
                    <li>Generate operational and administrative reports.</li>
                    <li>Maintain auditability and accountability of disciplinary records.</li>
                  </ul>

                  <h5>5. Data Sharing and Disclosure</h5>
                  <p>
                    Personal data is shared only with authorized school personnel who require
                    access for official duties. Data may also be disclosed when required by
                    law, court order, lawful request of competent authorities, or when necessary
                    to protect student welfare, campus safety, or institutional rights.
                  </p>

                  <h5>6. Storage and Security</h5>
                  <p>
                    SARES uses cloud-based services, including Firebase Authentication and
                    Firestore, with access controls and role-based restrictions maintained
                    by the School. Reasonable administrative, technical, and organizational
                    safeguards are implemented to protect personal data against unauthorized
                    access, alteration, disclosure, or destruction.
                  </p>

                  <h5>7. Data Retention and Disposal</h5>
                  <p>
                    Records are retained according to the School's records management and
                    student discipline policies. Upon reaching retention limits or when records
                    are no longer required, data will be archived or disposed of in accordance
                    with applicable school procedures and legal obligations.
                  </p>

                  <h5>8. Data Subject Rights</h5>
                  <p>
                    Data subjects may request access to and correction of personal data
                    processed in SARES through official school channels. Requests are reviewed
                    and acted upon in accordance with institutional procedures and applicable law.
                  </p>

                  <h5>9. Minor Student Data</h5>
                  <p>
                    SARES processes records relating to minor students strictly for
                    institutional disciplinary administration, student support, and policy
                    compliance. Handling of such records is limited to authorized personnel.
                  </p>

                  <h5>10. Policy Updates</h5>
                  <p>
                    The School may update this Privacy Policy from time to time to reflect
                    legal, operational, or system changes. Continued use of SARES after updates
                    constitutes acknowledgment of the revised policy.
                  </p>

                  <h5>11. Contact for Privacy Concerns</h5>
                  <p>
                    For privacy inquiries or requests, contact:<br />
                    <strong>Registrar's Office</strong><br />
                    <strong>Email:</strong> admin@ows.edu.ph<br />
                    <strong>Phone:</strong> (047) 222 2701
                  </p>
                </>
              ) : (
                <>
                  <h4>Terms of Use</h4>
                  <p><strong>Effective Date:</strong> May 14, 2026</p>
                  <p>
                    These Terms of Use govern access to and use of SARES operated by
                    Olongapo Wesley School. By using SARES, the user agrees to comply
                    with these Terms, school policies, and applicable Philippine laws.
                  </p>

                  <h5>1. Acceptance and Eligibility</h5>
                  <p>
                    SARES is for authorized school staff only. Access is granted solely
                    for official duties related to student affairs, guidance, and disciplinary
                    case management. Unauthorized use is strictly prohibited.
                  </p>

                  <h5>2. Account Responsibility and Security</h5>
                  <p>
                    Users are responsible for safeguarding account credentials and for all
                    activities conducted through their account. Users must not share login
                    credentials or permit unauthorized access.
                  </p>

                  <h5>3. Permitted Use</h5>
                  <p>Users may use SARES only for legitimate institutional purposes, including:</p>
                  <ul>
                    <li>Recording and managing student violation cases.</li>
                    <li>Reviewing handbook-based sanction recommendations.</li>
                    <li>Preparing internal reports and disciplinary documentation.</li>
                  </ul>

                  <h5>4. Prohibited Conduct</h5>
                  <p>Users must not:</p>
                  <ul>
                    <li>Access or attempt to access data beyond assigned authority.</li>
                    <li>Alter records without basis, authorization, or documentation.</li>
                    <li>Use SARES for personal, commercial, or non-school purposes.</li>
                    <li>Upload false, malicious, or misleading information.</li>
                    <li>Interfere with system security, integrity, or availability.</li>
                  </ul>

                  <h5>5. Recommendation Disclaimer</h5>
                  <p>
                    SARES provides decision-support recommendations based on configured
                    rules and available records. Recommendations are advisory and do not
                    automatically constitute final disciplinary action. Final decisions remain
                    subject to school authority, due process, and institutional judgment.
                  </p>

                  <h5>6. Record Integrity and Audit</h5>
                  <p>
                    Users must ensure that case entries are accurate, complete, and timely.
                    The School may review logs and records to verify compliance, investigate
                    irregularities, and support accountability.
                  </p>

                  <h5>7. Suspension or Termination</h5>
                  <p>
                    The School may suspend, restrict, or terminate access at any time for
                    policy violations, security risks, misuse, or operational reasons.
                  </p>

                  <h5>8. Service Availability and Liability</h5>
                  <p>
                    SARES is provided on an as-available basis. While the School aims to
                    maintain reliable service, it does not guarantee uninterrupted operation.
                    To the extent permitted by law, the School is not liable for indirect or
                    consequential damages arising from system use, outages, or data-entry errors.
                  </p>

                  <h5>9. Governing Law and Venue</h5>
                  <p>
                    These Terms are governed by the laws of the Republic of the Philippines.
                    Any dispute relating to SARES use shall be handled through appropriate
                    legal or administrative venues under Philippine jurisdiction.
                  </p>

                  <h5>10. Changes to Terms</h5>
                  <p>
                    The School may revise these Terms of Use as needed. Continued use of
                    SARES after updates constitutes acceptance of the revised Terms.
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
