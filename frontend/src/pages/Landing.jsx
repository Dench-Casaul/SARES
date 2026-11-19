import { Link, Navigate, useNavigate } from "react-router-dom";
import { GraduationCap, ShieldCheck } from "lucide-react";
import wesleyLogo from "../assets/wesley-logo.png";
import saresLogo from "../assets/sares-logo.png";
import { useAuthProfile } from "../authContext";
import "../css/Landing.css";

// Class on <html> that switches on the landing → login transition styles in Landing.css.
// It only exists while the transition runs, so the login page is otherwise untouched.
const TRANSITION_CLASS = "landing-to-login";

// Resolves once the login page has rendered (or after a short safety timeout),
// so the browser captures the new page for the transition. Uses setTimeout, not
// requestAnimationFrame: the browser pauses animation frames during a view transition.
function waitForLoginPage(timeoutMs = 800) {
  return new Promise((resolve) => {
    const startedAt = performance.now();
    const check = () => {
      if (document.querySelector(".app-shell") || performance.now() - startedAt > timeoutMs) {
        resolve();
      } else {
        setTimeout(check, 10);
      }
    };
    check();
  });
}

function Landing() {
  const { userProfile, authReady } = useAuthProfile();
  const navigate = useNavigate();

  const openLogin = (event, to) => {
    const prefersReducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const isPlainClick = event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
    // Fall back to a normal link (instant navigation, new-tab etc. still work).
    if (!document.startViewTransition || prefersReducedMotion || !isPlainClick) return;

    event.preventDefault();
    const root = document.documentElement;
    root.classList.add(TRANSITION_CLASS);
    const transition = document.startViewTransition(async () => {
      navigate(to);
      await waitForLoginPage();
    });
    transition.finished.finally(() => root.classList.remove(TRANSITION_CLASS));
  };

  // Signed-in users go back to the app; signing out only happens through Logout.
  if (authReady && userProfile) {
    return <Navigate to="/sares/dashboard" replace />;
  }

  // Render nothing while the session is being checked, so signed-in users
  // don't see the landing page flash before the redirect.
  if (!authReady) {
    return <main className="landing-page" aria-busy="true" />;
  }

  return (
    <main className="landing-page">
      <div className="landing-orb landing-orb--one" aria-hidden="true" />
      <div className="landing-orb landing-orb--two" aria-hidden="true" />
      <div className="landing-orb landing-orb--three" aria-hidden="true" />

      <section className="landing-center">
        <div className="landing-logos">
          <img
            src={wesleyLogo}
            alt="Olongapo Wesley School"
            className="landing-logo landing-logo--school"
          />
          <span className="landing-logo-divider" aria-hidden="true" />
          <img
            src={saresLogo}
            alt="SARES"
            className="landing-logo landing-logo--sares"
          />
        </div>

        <h1 className="landing-title">SARES</h1>
        <p className="landing-subtitle">Sanction Recommendation System</p>

        <nav className="landing-actions" aria-label="Sign in">
          <Link
            to="/login?type=elementary"
            onClick={(event) => openLogin(event, "/login?type=elementary")}
            className="landing-action"
          >
            <GraduationCap aria-hidden="true" />
            Elementary Counselor
          </Link>
          <Link
            to="/login?type=high_school"
            onClick={(event) => openLogin(event, "/login?type=high_school")}
            className="landing-action"
          >
            <GraduationCap aria-hidden="true" />
            High School Counselor
          </Link>
        </nav>

        <Link
          to="/login?type=superadmin"
          onClick={(event) => openLogin(event, "/login?type=superadmin")}
          className="landing-admin"
        >
          <ShieldCheck aria-hidden="true" />
          Admin sign-in
        </Link>
      </section>

      <footer className="landing-footer">
        © {new Date().getFullYear()} Olongapo Wesley School
      </footer>
    </main>
  );
}

export default Landing;
