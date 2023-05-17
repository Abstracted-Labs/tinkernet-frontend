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
import { PolkadotWalletsContextProvider, useWallets } from '@polkadot-onboard/react';
import { WalletAggregator } from '@polkadot-onboard/core';
import { InjectedWalletProvider } from '@polkadot-onboard/injected-wallets';
import { WalletConnectProvider } from "./stores/account";

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

const walletConnectParams = {
    projectId: '3e4e3c1e8ad4ac731c399248e20d69fd',
    relayUrl: 'wss://relay.walletconnect.com',
    metadata: {
        name: 'Tinkernet Dashboard',
        description: 'Tinkernet Dashboard dApp',
        url: 'https://tinker.network',
        icons: ['https://www.tinker.network/apple-touch-icon.png'],
    },
};

const walletAggregator = new WalletAggregator([
    new InjectedWalletProvider({}, "Tinkernet"),
    new WalletConnectProvider(walletConnectParams, "Tinkernet")
]);

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
    <React.StrictMode>
        <>
            <Toaster position="bottom-right" />
            <BrowserRouter>
                <ApiProvider>
                    <URQLProvider value={client}>
                        <PolkadotWalletsContextProvider walletAggregator={walletAggregator}>
                            <Modals />

                            <Routes>
                                <Route index element={<Navigate to="claim" replace={true} />} />
                                <Route path="/" element={<Layout />}>
                                    <Route path="claim" element={<Claim />} />

                                    <Route path="xtransfer" element={<XTransfer />} />

                                    <Route
                                        path="staking"
                                        element={<Staking />}
                                    />

                                    <Route path="404" element={<NotFound />} />

                                    <Route
                                        path="*"
                                        element={<Navigate to="/404" replace={true} />}
                                    />
                                </Route>
                            </Routes>
                        </PolkadotWalletsContextProvider>
                    </URQLProvider>
                </ApiProvider>
            </BrowserRouter>
        </>
    </React.StrictMode>
);
