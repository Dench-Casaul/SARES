import { Routes, Route, Navigate } from "react-router-dom"
import Dashboard from "./pages/Dashboard"
import Student from "./pages/Student"
import Violation from "./pages/Violation"
import Rule from "./pages/Rule"
import Report from "./pages/Reports"
import Login from "./pages/Login"

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/app" replace />} />
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<Navigate to="/login" />} />
      <Route path="/app" element={<Dashboard />} />
      <Route path="/app/students" element={<Student />} />
      <Route path="/app/violations/new" element={<Violation />} />
      <Route path="/app/rules" element={<Rule />} />
      <Route path="/app/reports" element={<Report />} />
    </Routes>
  );
}

export default App;