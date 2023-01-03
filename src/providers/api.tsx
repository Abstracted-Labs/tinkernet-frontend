import { ApiPromise } from "@polkadot/api";
import { createContext, ReactNode, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";

import LoadingSpinner from "../components/LoadingSpinner";
import useRPC, { host } from "../stores/rpc";

const ApiContext = createContext<ApiPromise | null>(null);

const { BRAINSTORM, REMOTE } = host;

const ApiProvider = ({ children }: { children: ReactNode }) => {
  const [api, setApi] = useState<ApiPromise | null>(null);
  const { createApi, host, error, setHost } = useRPC();
  const location = useLocation();

  useEffect(() => {
    (async () => {
      if (location.pathname === "/staking") {
        setHost(BRAINSTORM);
      } else {
        setHost(REMOTE);
      }

      const api = await createApi();

      setApi(api);
    })();

    return () => {
      api?.disconnect();
    };
  }, [createApi, host, location.pathname]);

  if (error)
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-neutral-900">
        <p className="text-center">
          <span className="text-white">
            Oops! Looks like there is an RPC issue.
          </span>

          <br />

          <span className="text-white">
            Head to the{" "}
            <a
              target="_blank"
              href="https://discord.gg/invarch"
              rel="noopener noreferrer"
              className="text-amber-400 hover:text-amber-600"
            >
              InvArch Discord
            </a>{" "}
            & feel free to message the team for assistance.
          </span>
        </p>
      </div>
    );

  if (!api)
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-neutral-900">
        <LoadingSpinner />
      </div>
    );

  return <ApiContext.Provider value={api}>{children}</ApiContext.Provider>;
};

export { ApiContext };

export default ApiProvider;
