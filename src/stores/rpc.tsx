import { ApiPromise, WsProvider } from "@polkadot/api";
import { ApiOptions } from "@polkadot/api/types";
import create from "zustand";

enum Host {
  REMOTE = "wss://tinker.invarch.network",
  LOCAL = "ws://127.0.0.1:9944",
}

type RPCState = {
  host: Host;
  setHost: (host: Host) => void;
  createApi: (options?: ApiOptions) => Promise<ApiPromise>;
};

const useRPC = create<RPCState>()((set, get) => ({
  host: Host.REMOTE,
  setHost: (host: Host) => set(() => ({ host })),
  createApi: async () => {
    const { host } = get();

    const wsProvider = new WsProvider(host);

    const api = await ApiPromise.create({
      provider: wsProvider,
    });

    return api;
  },
}));

export { Host };

export default useRPC;
