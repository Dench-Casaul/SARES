import { Routes, Route, Navigate } from "react-router-dom";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import Dashboard from "./pages/Dashboard";
import Student from "./pages/Student";
import Violation from "./pages/Violation";
import Rule from "./pages/Rule";
import Report from "./pages/Reports";
import Login from "./pages/Login";
import CaseAssessment from "./pages/CaseAssessment";
import Landing from "./pages/Landing";
import React, { useEffect, useState } from "react";
import { applySanctionOverrides } from "./data/handbookIndex";
import { auth, db } from "./firebase";
import { isAllowedLoginEmail } from "./authPolicy";

class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, errorMessage: "" };
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      errorMessage: error?.message || "Unexpected application error",
    };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: "24px", color: "#fff", fontFamily: "sans-serif" }}>
          <h2>Something went wrong</h2>
          <p>{this.state.errorMessage}</p>
          <p>Please refresh the page. If this continues, share this message.</p>
        </div>
      );
    }

    return this.props.children;
  }
}

function RequireAuth({ children, isAuthenticated, authReady }) {
  if (!authReady) return null;
  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

function App() {
  const [authReady, setAuthReady] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [ruleRevision, setRuleRevision] = useState(0);

  useEffect(() => {
    let unsubscribeRuleOverrides = () => {};
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribeRuleOverrides();
      setAuthReady(false);
      if (user && !isAllowedLoginEmail(user.email || "")) {
        signOut(auth).catch(() => {});
        localStorage.removeItem("user");
        setIsAuthenticated(false);
        setAuthReady(true);
        return;
      }

      const signedIn = Boolean(user);
      setIsAuthenticated(signedIn);

      if (!signedIn) {
        localStorage.removeItem("user");
        applySanctionOverrides();
        setAuthReady(true);
        return;
      }

      unsubscribeRuleOverrides = onSnapshot(
        doc(db, "rules", "handbook_sanctions"),
        (snapshot) => {
          applySanctionOverrides(snapshot.exists() ? snapshot.data() : {});
          setRuleRevision((revision) => revision + 1);
          setAuthReady(true);
        },
        (error) => {
          console.error("Failed to load handbook sanction updates:", error);
          applySanctionOverrides();
          setAuthReady(true);
        }
      );
    });

    return () => {
      unsubscribe();
      unsubscribeRuleOverrides();
    };
  }, []);

  return (
    <div data-rule-revision={ruleRevision}>
    <AppErrorBoundary>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route
          path="/sares"
          element={
            <RequireAuth isAuthenticated={isAuthenticated} authReady={authReady}>
              <Navigate to="/sares/dashboard" replace />
            </RequireAuth>
          }
        />
        <Route path="/sares/dashboard" element={<RequireAuth isAuthenticated={isAuthenticated} authReady={authReady}><Dashboard /></RequireAuth>} />
        <Route path="/sares/students" element={<RequireAuth isAuthenticated={isAuthenticated} authReady={authReady}><Student /></RequireAuth>} />
        <Route path="/sares/violation" element={<RequireAuth isAuthenticated={isAuthenticated} authReady={authReady}><Violation /></RequireAuth>} />
        <Route path="/sares/case-assessment/:violationId" element={<RequireAuth isAuthenticated={isAuthenticated} authReady={authReady}><CaseAssessment /></RequireAuth>} />
        <Route path="/sares/case-assessment" element={<RequireAuth isAuthenticated={isAuthenticated} authReady={authReady}><CaseAssessment /></RequireAuth>} />
        <Route path="/sares/rules" element={<RequireAuth isAuthenticated={isAuthenticated} authReady={authReady}><Rule /></RequireAuth>} />
        <Route path="/sares/reports" element={<RequireAuth isAuthenticated={isAuthenticated} authReady={authReady}><Report /></RequireAuth>} />
        <Route path="/dashboard" element={<RequireAuth isAuthenticated={isAuthenticated} authReady={authReady}><Dashboard /></RequireAuth>} />
        <Route path="/students" element={<RequireAuth isAuthenticated={isAuthenticated} authReady={authReady}><Student /></RequireAuth>} />
        <Route path="/violation" element={<RequireAuth isAuthenticated={isAuthenticated} authReady={authReady}><Violation /></RequireAuth>} />
        <Route path="/case-assessment/:violationId" element={<RequireAuth isAuthenticated={isAuthenticated} authReady={authReady}><CaseAssessment /></RequireAuth>} />
        <Route path="/case-assessment" element={<RequireAuth isAuthenticated={isAuthenticated} authReady={authReady}><CaseAssessment /></RequireAuth>} />
        <Route path="/rules" element={<RequireAuth isAuthenticated={isAuthenticated} authReady={authReady}><Rule /></RequireAuth>} />
        <Route path="/reports" element={<RequireAuth isAuthenticated={isAuthenticated} authReady={authReady}><Report /></RequireAuth>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppErrorBoundary>
    </div>
  );
}

export default App;
