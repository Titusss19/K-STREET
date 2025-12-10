import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import Register from "./Register/register";
import Login from "./Login/Login";
import Dashboard from "./Dashboard/Dashboard";
import POS from "./POS/POS";
import AttendancePortal from "./Attendance/attendance";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />
        <Route path="/Dashboard" element={<Dashboard />} />
        <Route path="/pos" element={<POS />} />
        <Route path="/attendance" element={<AttendancePortal />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
