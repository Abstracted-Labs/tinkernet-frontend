import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import {
  createClient,
  Provider as URQLProvider,
  defaultExchanges,
  subscriptionExchange,
} from "urql";
import { createClient as createWSClient } from "graphql-ws";

import Claim from "./routes/claim";
import XTransfer from "./routes/xtransfer";
import Staking from "./routes/staking";
import NotFound from "./routes/not-found";

import "./index.css";
import { Toaster } from "react-hot-toast";
import ApiProvider from "./providers/api";
import Layout from "./components/Layout";
import Modals from "./modals";

const wsClient = createWSClient({
  url: "wss://squid.subsquid.io/ocif-squid/v/v1/graphql",
});

const client = createClient({
  url: "https://squid.subsquid.io/ocif-squid/v/v1/graphql",
  exchanges: [
    ...defaultExchanges,
    subscriptionExchange({
      forwardSubscription: (operation) => ({
        subscribe: (sink) => ({
          unsubscribe: wsClient.subscribe(operation, sink),
        }),
      }),
    }),
  ],
});

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <>
      <Toaster position="bottom-right" />
      <BrowserRouter>
        <ApiProvider>
          <URQLProvider value={client}>
            <Modals />

            <Routes>
              <Route index element={<Navigate to="claim" replace={true} />} />
              <Route path="/" element={<Layout />}>
                <Route path="claim" element={<Claim />} />

                <Route path="xtransfer" element={<XTransfer />} />

                <Route
                  path="9ce8094c-c508-4951-b227-6521996ed555"
                  element={<Staking />}
                />

                <Route path="404" element={<NotFound />} />

                <Route
                  path="*"
                  element={<Navigate to="/404" replace={true} />}
                />
              </Route>
            </Routes>
          </URQLProvider>
        </ApiProvider>
      </BrowserRouter>
    </>
  </React.StrictMode>
);
