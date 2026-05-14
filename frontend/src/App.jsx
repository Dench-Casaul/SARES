import { Routes, Route, Navigate } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import Dashboard from "./pages/Dashboard";
import Student from "./pages/Student";
import Violation from "./pages/Violation";
import Rule from "./pages/Rule";
import Report from "./pages/Reports";
import Login from "./pages/Login";
import CaseAssessment from "./pages/CaseAssessment";
import Landing from "./pages/Landing";
import React, { useEffect, useState } from "react";
import { auth } from "./firebase";

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

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      const signedIn = Boolean(user);
      setIsAuthenticated(signedIn);
      setAuthReady(true);

      if (!signedIn) {
        localStorage.removeItem("user");
      }
    });

    return () => unsubscribe();
  }, []);

  return (
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
        <Route path="/sares/case-assessment" element={<RequireAuth isAuthenticated={isAuthenticated} authReady={authReady}><CaseAssessment /></RequireAuth>} />
        <Route path="/sares/rules" element={<RequireAuth isAuthenticated={isAuthenticated} authReady={authReady}><Rule /></RequireAuth>} />
        <Route path="/sares/reports" element={<RequireAuth isAuthenticated={isAuthenticated} authReady={authReady}><Report /></RequireAuth>} />
        <Route path="/dashboard" element={<RequireAuth isAuthenticated={isAuthenticated} authReady={authReady}><Dashboard /></RequireAuth>} />
        <Route path="/students" element={<RequireAuth isAuthenticated={isAuthenticated} authReady={authReady}><Student /></RequireAuth>} />
        <Route path="/violation" element={<RequireAuth isAuthenticated={isAuthenticated} authReady={authReady}><Violation /></RequireAuth>} />
        <Route path="/case-assessment" element={<RequireAuth isAuthenticated={isAuthenticated} authReady={authReady}><CaseAssessment /></RequireAuth>} />
        <Route path="/rules" element={<RequireAuth isAuthenticated={isAuthenticated} authReady={authReady}><Rule /></RequireAuth>} />
        <Route path="/reports" element={<RequireAuth isAuthenticated={isAuthenticated} authReady={authReady}><Report /></RequireAuth>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppErrorBoundary>
  );
}

export default App;
