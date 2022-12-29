import { WsProvider, ApiPromise } from "@polkadot/api";
import { InjectedAccountWithMeta } from "@polkadot/extension-inject/types";
import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import shallow from "zustand/shallow";
import LoadingSpinner from "../components/LoadingSpinner";
import useAccount from "../stores/account";

type StakingCore = {
  account: string;
  metadata: {
    name: string;
    description: string;
    image: string;
  };
};

const BRAINSTORM_RPC_URL = "wss://brainstorm.invarch.network";

const Staking = () => {
  const { selectedAccount } = useAccount(
    (state) => ({ selectedAccount: state.selectedAccount }),
    shallow
  );
  const [stakingCores, setStakingCores] = useState<StakingCore[]>([]);
  const [currentEra, setCurrentEra] = useState<{era: number; erasPerYear: number}>([]);
  const [isLoading, setLoading] = useState(false);

  const loadStakingCores = async ({ address }: InjectedAccountWithMeta) => {
    setLoading(true);

    try {
      toast.loading("Loading staking cores...");

      const wsProviderBST = new WsProvider(BRAINSTORM_RPC_URL);

      const apiBST = await ApiPromise.create({ provider: wsProviderBST });

      const results = await Promise.all([
        // registered cores
        apiBST.query.ocifStaking.registeredCore.entries(),
        apiBST.query.checkedInflation.currentEra()
      ]);

      setCurrentEra({era: results[1].toPrimitive() as number, erasPerYear: apiBST.consts.checkedInflation.erasPerYear.toPrimitive() as number});

      const stakingCores = results[0].map(([, core]) => {
        return core.toPrimitive() as {
          account: string;
          metadata: {
            name: string;
            description: string;
            image: string;
          };
        };
      });

      setStakingCores(stakingCores);

      toast.dismiss();

      setLoading(false);
    } catch (e) {
      console.error(e);

      toast.dismiss();

      setLoading(false);

      toast.error("Failed to load staking cores!");
    }
  };

  const handleStake = async (core: StakingCore) => {
    console.log(core);
  };

  const handleUnstake = async (core: StakingCore) => {
    console.log(core);
  };

  const handleClaim = async () => {
    console.log("TODO");
  };

  useEffect(() => {
    if (!selectedAccount) return;

    loadStakingCores(selectedAccount);
  }, [selectedAccount]);

  return (
    <>
      {isLoading ? (
        <div className="flex items-center justify-center">
          <LoadingSpinner />
        </div>
      ) : null}

      {!isLoading && stakingCores.length > 0 ? (
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-8 p-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <span>Dashboard</span>
            </div>

            <div>
              <button
                type="button"
                className="inline-flex items-center justify-center rounded-md border border-amber-300 bg-amber-300 px-4 py-2 text-base font-medium text-black shadow-sm hover:bg-amber-200 focus:outline-none focus:ring-2 focus:ring-neutral-500 focus:ring-offset-2"
                onClick={handleClaim}
              >
                Claim All
              </button>
            </div>
          </div>

          <div className="overflow-hidden rounded-md border border-neutral-50 bg-black shadow sm:grid sm:grid-cols-3">
            <div className="flex flex-col gap-2 p-6">
              <div>
                <span className="text-sm">Total staked</span>
              </div>
              <div>
                <span className="text-2xl font-bold">12 TNKR</span>
              </div>
            </div>

            <div className="flex flex-col gap-2 p-6">
              <div>
                <span className="text-sm">Available to claim</span>
              </div>
              <div>
                <span className="text-2xl font-bold">1 TNKR</span>
              </div>
            </div>

            <div className="flex flex-col gap-2 p-6">
              <div>
                <span className="text-sm">Current Era</span>
              </div>
              <div>
                <span className="text-2xl font-bold">{currentEra.era} / {currentEra.erasPerYear}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {stakingCores.map((core) => (
              <div
                key={core.account}
                className="relative flex flex-col gap-4 overflow-hidden rounded-md border border-neutral-50 p-6 sm:flex-row"
              >
                <div className="absolute top-6 right-6">
                  <span>12 TNKR</span>
                </div>

                <div className="flex flex-shrink-0">
                  <img
                    src={core.metadata.image}
                    alt={core.metadata.name}
                    className="h-16 w-16 rounded-full"
                  />
                </div>
                <div className="flex flex-col gap-4">
                  <h4 className="font-bold">{core.metadata.name}</h4>

                  <p className="text-sm line-clamp-3">
                    {core.metadata.description}
                  </p>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="inline-flex items-center justify-center rounded-md border border-amber-300 bg-amber-300 px-2 py-1 text-sm font-medium text-black shadow-sm hover:bg-amber-200 focus:outline-none focus:ring-2 focus:ring-neutral-500 focus:ring-offset-2"
                      onClick={() => handleStake(core)}
                    >
                      Stake
                    </button>

                    <button
                      type="button"
                      className="inline-flex items-center justify-center rounded-md border border-pink-600 bg-pink-600 px-2 py-1 text-sm font-medium text-black shadow-sm hover:bg-pink-500 focus:outline-none focus:ring-2 focus:ring-neutral-500 focus:ring-offset-2"
                      onClick={() => handleUnstake(core)}
                    >
                      Unstake
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between">
            <div />

            <div>
              <button
                type="button"
                disabled
                className="inline-flex items-center justify-center rounded-md border border-amber-300 bg-amber-300 px-4 py-2 text-base font-medium text-black shadow-sm hover:bg-amber-200 focus:outline-none focus:ring-2 focus:ring-neutral-500 focus:ring-offset-2"
                onClick={handleClaim}
              >
                Add New
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
};

export default Staking;
