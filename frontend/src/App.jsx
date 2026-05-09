import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import Dashboard from "./pages/Dashboard";
import Student from "./pages/Student";
import Violation from "./pages/Violation";
import Rule from "./pages/Rule";
import Report from "./pages/Reports";
import Login from "./pages/Login";

function App() {
  return React.createElement(
    Routes,
    null,

    React.createElement(Route, {
      path: "/",
      element: React.createElement(Navigate, {
        to: "/login",
        replace: true,
      }),
    }),

    React.createElement(Route, {
      path: "/login",
      element: React.createElement(Login),
    }),

    React.createElement(Route, {
      path: "/sares/dashboard",
      element: React.createElement(Dashboard),
    }),

    React.createElement(Route, {
      path: "/sares/students",
      element: React.createElement(Student),
    }),

    React.createElement(Route, {
      path: "/sares/violation",
      element: React.createElement(Violation),
    }),

    React.createElement(Route, {
      path: "/sares/rules",
      element: React.createElement(Rule),
    }),

    React.createElement(Route, {
      path: "/sares/reports",
      element: React.createElement(Report),
    })
  );
}

export default App;