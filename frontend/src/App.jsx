import { Routes, Route, Navigate } from "react-router-dom";
import Dashboard from "./pages/Dashboard";
import Student from "./pages/Student";
import Violation from "./pages/Violation";
import Rule from "./pages/Rule";
import Report from "./pages/Reports";
import Login from "./pages/Login";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<Login />} />
      <Route path="/sares/dashboard" element={<Dashboard />} />
      <Route path="/sares/students" element={<Student />} />
      <Route path="/sares/violation" element={<Violation />} />
      <Route path="/sares/rules" element={<Rule />} />
      <Route path="/sares/reports" element={<Report />} />
    </Routes>
  );
}

export default App;