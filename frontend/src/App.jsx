import { Routes, Route, Navigate } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import Student from "./pages/Student";
import Violation from "./pages/Violation";
import Rule from "./pages/Rule";
import Report from "./pages/Reports";
import Login from "./pages/Login";
import React from "react";

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

function App() {
  return (
    <AppErrorBoundary>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/sares" element={<Navigate to="/sares/dashboard" replace />} />
        <Route path="/sares/dashboard" element={<Dashboard />} />
        <Route path="/sares/students" element={<Student />} />
        <Route path="/sares/violation" element={<Violation />} />
        <Route path="/sares/rules" element={<Rule />} />
        <Route path="/sares/reports" element={<Report />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </AppErrorBoundary>
  );
}

export default App;