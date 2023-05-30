import { ApiPromise, WsProvider } from "@polkadot/api";
import { ApiOptions } from "@polkadot/api/types";
import { create } from "zustand";

const host = {
  REMOTE: "wss://invarch-tinkernet.api.onfinality.io/public-ws",
  LOCAL: "ws://127.0.0.1:9944",
} as const;

type Host = (typeof host)[keyof typeof host];

type RPCState = {
  host: Host;
  setHost: (host: Host) => void;
  createApi: (options?: ApiOptions) => Promise<ApiPromise>;
  error: unknown | null;
};

const useRPC = create<RPCState>()((set, get) => ({
  host: host.REMOTE,
  // host: host.LOCAL,
  setHost: (host: Host) => set(() => ({ host })),
  error: null,
  createApi: async (options) => {
    const { host } = get();
    const wsProvider = new WsProvider(host);

    try {
      const api = await ApiPromise.create(
        options || {
          provider: wsProvider,
          // throwOnConnect: true,
        }
      );

      set(() => ({ error: null }));

      return api;
    } catch (error) {
      set(() => ({ error}));

      console.error(error);

      throw new Error(`Failed to connect to ${host}`);
    }
  },
}));

export type { Host };

export { host };

export default useRPC;
