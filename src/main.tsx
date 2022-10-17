import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Claim from "./routes/claim";
import XTransfer from "./routes/xtransfer";

import "./index.css";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        {/* Just for now, as we only have the claim */}
        <Route index element={<Navigate to="claim" replace={true} />} />
        <Route path="claim" element={<Claim />} />
        <Route path="xtransfer" element={<XTransfer />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
