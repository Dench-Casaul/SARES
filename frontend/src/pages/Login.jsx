import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";
import { signInWithEmailAndPassword } from "firebase/auth";
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

  const navigate = useNavigate();

  const handleLogin = async (event) => {
    event.preventDefault();

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

            <button type="submit" className="login-button" disabled={loading}>
              {loading ? "Logging in..." : "Login"}
            </button>
          </form>

          <a href="#!" className="forgot-password">
            Forgot password?
          </a>
        </div>
      </main>
    </div>
  );
}

export default Login;