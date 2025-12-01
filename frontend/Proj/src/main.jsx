import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";

import Register from "./Register/register";
import Login from "./Login/Login";
import Dashboard from "./Dashboard/Dashboard";
import POS from "./POS/POS";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/login" element={<Login />} />
        <Route path="/Dashboard" element={<Dashboard />} />
        <Route path="/pos" element={<POS />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
