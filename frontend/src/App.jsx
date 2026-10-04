import { Routes, Route, Navigate } from "react-router-dom";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc, onSnapshot } from "firebase/firestore";
import Dashboard from "./pages/Dashboard";
import Student from "./pages/Student";
import Violation from "./pages/Violation";
import Rule from "./pages/Rule";
import Report from "./pages/Reports";
import Login from "./pages/Login";
import CaseAssessment from "./pages/CaseAssessment";
import Landing from "./pages/Landing";
import AccountSecurity from "./pages/AccountSecurity";
import SystemLogs from "./pages/SystemLogs";
import React, { useEffect, useState } from "react";
import { applyHandbookOverrides, applySanctionOverrides } from "./data/handbookIndex";
import { auth, db } from "./firebase";
import { isAllowedLoginEmail } from "./authPolicy";
import { isValidRoleProfile } from "./schoolScope";
import { AuthProfileContext } from "./authContext";

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

function RequireSuperadmin({ children, userProfile }) {
  return userProfile?.role === "superadmin"
    ? children
    : <Navigate to="/sares/dashboard" replace />;
}

function App() {
  const [authReady, setAuthReady] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const [ruleRevision, setRuleRevision] = useState(0);

  useEffect(() => {
    let unsubscribeRuleOverrides = () => {};
    let authEvent = 0;
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      const currentEvent = ++authEvent;
      unsubscribeRuleOverrides();
      setAuthReady(false);
      setUserProfile(null);

      if (!user) {
        localStorage.removeItem("user");
        applyHandbookOverrides();
        applySanctionOverrides();
        setAuthReady(true);
        return;
      }

      try {
        const email = user.email || "";
        if (!isAllowedLoginEmail(email)) throw new Error("This account is not eligible to sign in.");

        const profileSnapshot = await getDoc(doc(db, "users", user.uid));
        const profileData = profileSnapshot.exists() ? profileSnapshot.data() : null;
        const profile = profileData ? {
          ...profileData,
          user_id: user.uid,
          email,
          full_name: profileData.full_name || user.displayName || email,
        } : null;

        if (!isValidRoleProfile(profile)) throw new Error("This account has no valid SARES role.");
        if (currentEvent !== authEvent) return;

        setUserProfile(profile);
        setAuthReady(true);
        unsubscribeRuleOverrides = onSnapshot(
          doc(db, "rules", "handbook_sanctions"),
          (snapshot) => {
            const overrides = snapshot.exists() ? snapshot.data() : {};
            applyHandbookOverrides(overrides);
            applySanctionOverrides(overrides);
            setRuleRevision((revision) => revision + 1);
          },
          (error) => {
            console.error("Failed to load handbook sanction updates:", error);
            applyHandbookOverrides();
            applySanctionOverrides();
          }
        );
      } catch (error) {
        console.error("Failed to validate SARES account:", error);
        if (currentEvent === authEvent) {
          localStorage.removeItem("user");
          await signOut(auth).catch(() => {});
          setUserProfile(null);
          setAuthReady(true);
        }
      }
    });

    return () => {
      authEvent += 1;
      unsubscribe();
      unsubscribeRuleOverrides();
    };
  }, []);

  return (
    <div data-rule-revision={ruleRevision}>
      <AuthProfileContext.Provider value={{ userProfile }}>
        <AppErrorBoundary>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/sares" element={<RequireAuth isAuthenticated={Boolean(userProfile)} authReady={authReady}><Navigate to="/sares/dashboard" replace /></RequireAuth>} />
            <Route path="/sares/dashboard" element={<RequireAuth isAuthenticated={Boolean(userProfile)} authReady={authReady}><Dashboard /></RequireAuth>} />
            <Route path="/sares/students" element={<RequireAuth isAuthenticated={Boolean(userProfile)} authReady={authReady}><Student /></RequireAuth>} />
            <Route path="/sares/violation" element={<RequireAuth isAuthenticated={Boolean(userProfile)} authReady={authReady}><Violation /></RequireAuth>} />
            <Route path="/sares/case-assessment/:violationId" element={<RequireAuth isAuthenticated={Boolean(userProfile)} authReady={authReady}><CaseAssessment /></RequireAuth>} />
            <Route path="/sares/case-assessment" element={<RequireAuth isAuthenticated={Boolean(userProfile)} authReady={authReady}><CaseAssessment /></RequireAuth>} />
            <Route path="/sares/rules" element={<RequireAuth isAuthenticated={Boolean(userProfile)} authReady={authReady}><Rule /></RequireAuth>} />
            <Route path="/sares/reports" element={<RequireAuth isAuthenticated={Boolean(userProfile)} authReady={authReady}><Report /></RequireAuth>} />
            <Route path="/sares/account" element={<RequireAuth isAuthenticated={Boolean(userProfile)} authReady={authReady}><AccountSecurity /></RequireAuth>} />
            <Route path="/sares/system-logs" element={<RequireAuth isAuthenticated={Boolean(userProfile)} authReady={authReady}><RequireSuperadmin userProfile={userProfile}><SystemLogs /></RequireSuperadmin></RequireAuth>} />
            <Route path="/dashboard" element={<RequireAuth isAuthenticated={Boolean(userProfile)} authReady={authReady}><Dashboard /></RequireAuth>} />
            <Route path="/students" element={<RequireAuth isAuthenticated={Boolean(userProfile)} authReady={authReady}><Student /></RequireAuth>} />
            <Route path="/violation" element={<RequireAuth isAuthenticated={Boolean(userProfile)} authReady={authReady}><Violation /></RequireAuth>} />
            <Route path="/case-assessment/:violationId" element={<RequireAuth isAuthenticated={Boolean(userProfile)} authReady={authReady}><CaseAssessment /></RequireAuth>} />
            <Route path="/case-assessment" element={<RequireAuth isAuthenticated={Boolean(userProfile)} authReady={authReady}><CaseAssessment /></RequireAuth>} />
            <Route path="/rules" element={<RequireAuth isAuthenticated={Boolean(userProfile)} authReady={authReady}><Rule /></RequireAuth>} />
            <Route path="/reports" element={<RequireAuth isAuthenticated={Boolean(userProfile)} authReady={authReady}><Report /></RequireAuth>} />
            <Route path="/account" element={<RequireAuth isAuthenticated={Boolean(userProfile)} authReady={authReady}><AccountSecurity /></RequireAuth>} />
            <Route path="/system-logs" element={<RequireAuth isAuthenticated={Boolean(userProfile)} authReady={authReady}><RequireSuperadmin userProfile={userProfile}><SystemLogs /></RequireSuperadmin></RequireAuth>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AppErrorBoundary>
      </AuthProfileContext.Provider>
    </div>
  );
}

export default App;
