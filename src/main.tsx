import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Claim from "./routes/claim";
import XTransfer from "./routes/xtransfer";
import Staking from "./routes/staking";
import NotFound from "./routes/not-found";

import "./index.css";
import { Toaster } from "react-hot-toast";
import ApiProvider from "./providers/api";
import Layout from "./components/Layout";
import Modals from "./modals";

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <ApiProvider>
      <>
        <Toaster position="bottom-right" />
        <BrowserRouter>
          <Modals />

          <Routes>
            <Route index element={<Navigate to="claim" replace={true} />} />
            <Route path="/" element={<Layout />}>
              <Route path="claim" element={<Claim />} />

              <Route path="xtransfer" element={<XTransfer />} />

              <Route path="staking" element={<Staking />} />

              <Route path="404" element={<NotFound />} />

              <Route path="*" element={<Navigate to="/404" replace={true} />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </>
    </ApiProvider>
  </React.StrictMode>
);
