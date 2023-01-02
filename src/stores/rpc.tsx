import { ApiPromise, WsProvider } from "@polkadot/api";
import { ApiOptions } from "@polkadot/api/types";
import create from "zustand";

enum Host {
  // REMOTE = "wss://tinker.invarch.network",
  REMOTE = "wss://invarch-tinkernet.api.onfinality.io/public-ws",
  LOCAL = "ws://127.0.0.1:9944",
}

type RPCState = {
  host: Host;
  setHost: (host: Host) => void;
  createApi: (options?: ApiOptions) => Promise<ApiPromise>;
  error: unknown | null;
};

const useRPC = create<RPCState>()((set, get) => ({
  host: Host.REMOTE,
  setHost: (host: Host) => set(() => ({ host })),
  error: null,
  createApi: async () => {
    const { host } = get();

    const wsProvider = new WsProvider(host);

    try {
      const api = await ApiPromise.create({
        provider: wsProvider,
        // while we are testing on another chain, we don't want to throw errors on connect
        // throwOnConnect: true,
      });

      set(() => ({ error: null }));

      return api;
    } catch (e) {
      set(() => ({ error: e }));

      throw new Error("Unable to connect to RPC");
    }
  },
}));

export { Host };

export default useRPC;
