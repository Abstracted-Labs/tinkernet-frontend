import { ApiPromise } from "@polkadot/api";
import { createContext, ReactNode, useEffect, useState } from "react";

import LoadingSpinner from "../components/LoadingSpinner";
import useRPC from "../stores/rpc";

const ApiContext = createContext<ApiPromise | null>(null);

const ApiProvider = ({ children }: { children: ReactNode }) => {
  const [api, setApi] = useState<ApiPromise | null>(null);
  const { createApi, host } = useRPC();

  useEffect(() => {
    (async () => {
      const api = await createApi();

      setApi(api);
    })();
  }, [createApi, host]);

  if (!api) return <LoadingSpinner />;

  return <ApiContext.Provider value={api}>{children}</ApiContext.Provider>;
};

export { ApiContext };

export default ApiProvider;
