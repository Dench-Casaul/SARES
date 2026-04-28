import { useState } from "react";
import { useNavigate } from "react-router-dom";
import heroImg from "../assets/hero.png";
import "../css/Login.css";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleLogin = async (event) => {
    event.preventDefault();

    setError("");
    setLoading(true);

    try {
      const response = await fetch("http://127.0.0.1:5000/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: email,
          password: password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Invalid email or password.");
        return;
      }

      // save logged-in user info
      localStorage.setItem("user", JSON.stringify(data.user));

      navigate("/app");
    } catch (error) {
      console.error("Login error:", error);
      setError("Cannot connect to the server. Please check if Flask is running.");
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

        <div className="hero-copy">
          <h1 className="hero-title">SARES</h1>
          <p className="hero-description">
            Rule-based sanction recommendations, real-time analytics, and
            comprehensive student profile management for modern campus
            operations.
          </p>

          <ul className="feature-list">
            <li>Rule-based sanction recommendations</li>
            <li>Real-time analytics and reporting</li>
            <li>Comprehensive student profile management</li>
          </ul>
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
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M4 6h16" />
                    <path d="M4 6l8 7 8-7" />
                    <path d="M4 18h16V8L12 15 4 8v10z" />
                  </svg>
                </span>

                <input
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="Email Address"
                  className="input-field"
                  required
                />
              </div>
            </label>

            <label className="form-field">
              <span>Password</span>

              <div className="input-group">
                <span className="input-icon" aria-hidden="true">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <rect x="6" y="11" width="12" height="9" rx="2" />
                    <path d="M8 11V8a4 4 0 0 1 8 0v3" />
                  </svg>
                </span>

                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Password"
                  className="input-field"
                  required
                />
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