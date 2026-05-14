import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import wesleyLogo from "../assets/wesley-logo.png";
import saresLogo from "../assets/sares-logo.png";
import { auth } from "../firebase";
import "../css/Landing.css";

function Landing() {
  const navigate = useNavigate();

  useEffect(() => {
    signOut(auth).catch(() => {
      // Best-effort sign out to prevent stale sessions on the landing screen.
    });
    localStorage.removeItem("user");
  }, []);

  return (
    <main className="landing-page">
      <section className="landing-hero" id="overview">
        <div className="hero-logos">
          <img src={wesleyLogo} alt="Olongapo Wesley School seal" className="hero-logo" />
          <img src={saresLogo} alt="SARES logo" className="hero-logo" />
        </div>
        <h1>
          A Sanction Recommendation System
        </h1>
        <p className="hero-subcopy">
          Sares supports the guidance counselor by reducing manual cross-referencing and
          provide necessary sanctions derived from the student handbook
        </p>
        <button type="button" className="hero-cta" onClick={() => navigate("/login")}>
          Continue to Login
        </button>
      </section>

      <section className="landing-features" id="benefits">
        <h2>Why use sares</h2>
        <div className="feature-grid">
          <article className="feature-item">
            <h3>Consistent Recommendations</h3>
            <p>Apply handbook-based standards so outcomes stay fair and predictable.</p>
          </article>

          <article className="feature-item">
            <h3>Faster Case Handling</h3>
            <p>Centralize incident details, violations, and actions in one streamlined flow.</p>
          </article>

          <article className="feature-item">
            <h3>Actionable Reporting</h3>
            <p>Track trends and case history to support data-informed student discipline.</p>
          </article>
        </div>
      </section>
    </main>
  );
}

export default Landing;
