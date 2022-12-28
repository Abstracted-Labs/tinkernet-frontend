import "@polkadot/api-augment";
import { web3FromAddress } from "@polkadot/extension-dapp";
import { InjectedAccountWithMeta } from "@polkadot/extension-inject/types";
import { SVGProps, useEffect, useState } from "react";
import { BN, formatBalance } from "@polkadot/util";
import { Struct } from "@polkadot/types";
import BigNumber from "bignumber.js";

import background from "../assets/background.svg";
import { toast } from "react-hot-toast";
import useRPC from "../stores/rpc";
import useAccount from "../stores/account";
import shallow from "zustand/shallow";
import LoadingSpinner from "../components/LoadingSpinner";

type SystemAccount = Struct & {
  data: {
    free: BN;
    reserved: BN;
    miscFrozen: BN;
    feeFrozen: BN;
  };
};

type VestingData = {
  vestedLocked: string;
  vestedClaimable: string;
  total: string;
  transferable: string;
  remainingVestingPeriod: string;
};

const Home = () => {
  const { createApi } = useRPC();
  const { selectedAccount } = useAccount(
    (state) => ({ selectedAccount: state.selectedAccount }),
    shallow
  );
  const [vestingData, setVestingData] = useState<VestingData | null>(null);
  const [isLoading, setLoading] = useState(false);

  const loadBalances = async ({ address }: InjectedAccountWithMeta) => {
    setLoading(true);

    try {
      toast.loading("Loading balances...");
      const api = await createApi();

      const results = await Promise.all([
        // vested locked
        api.query.balances.locks(address),
        // vesting schedules
        api.query.vesting.vestingSchedules(address),
        // current block
        api.query.system.number(),
        // total
        api.query.system.account<SystemAccount>(address),
      ]);

      const vestedLocked = new BigNumber(
        results[0]
          .find((lock) => lock.id.toHuman() === "ormlvest")
          ?.amount.toString() || "0"
      );

      const vestingSchedules = results[1] as unknown as {
        start: number;
        period: number;
        periodCount: number;
        perPeriod: number;
      }[];

      const currentBlock = results[2];

      const remainingVestingPeriod = vestingSchedules.length
        ? vestingSchedules[0].periodCount -
          (currentBlock.toNumber() - vestingSchedules[0].start)
        : 0;

      const sumFutureLock = vestingSchedules.reduce((acc, vestingSchedule) => {
        const startPeriod = new BigNumber(vestingSchedule.start);

        const period = new BigNumber(vestingSchedule.period);

        // if the vesting has not started, number of periods is 0
        let numberOfPeriods = new BigNumber(currentBlock.toString())
          .minus(startPeriod)
          .dividedBy(period);

        numberOfPeriods = numberOfPeriods.isNegative()
          ? new BigNumber("0")
          : numberOfPeriods;

        const perPeriod = new BigNumber(vestingSchedule.perPeriod);

        const vestedOverPeriods = numberOfPeriods.multipliedBy(perPeriod);

        const periodCount = new BigNumber(vestingSchedule.periodCount);

        const originalLock = periodCount.multipliedBy(perPeriod);

        const unlocked = vestedOverPeriods.gte(originalLock)
          ? originalLock
          : vestedOverPeriods;

        const futureLock = originalLock.minus(unlocked);

        return acc.plus(futureLock);
      }, new BigNumber("0"));

      const vestedClaimable = vestedLocked.minus(sumFutureLock);

      const total = new BigNumber(results[3].data.free.toString());

      const transferable = total.minus(vestedLocked);

      setVestingData({
        vestedLocked: formatBalance(vestedLocked.toString(), {
          decimals: 12,
          withUnit: "TNKR",
          forceUnit: "-",
        }),
        vestedClaimable: formatBalance(vestedClaimable.toString(), {
          decimals: 12,
          withUnit: "TNKR",
          forceUnit: "-",
        }),
        total: formatBalance(total.toString(), {
          decimals: 12,
          withUnit: "TNKR",
          forceUnit: "-",
        }),
        transferable: formatBalance(transferable.toString(), {
          decimals: 12,
          withUnit: "TNKR",
          forceUnit: "-",
        }),
        remainingVestingPeriod: new Intl.NumberFormat("en-US", {}).format(
          remainingVestingPeriod
        ),
      });

      toast.dismiss();

      setLoading(false);

      toast.success("Balances loaded");
    } catch (error) {
      toast.dismiss();

      setLoading(false);

      toast.error("Failed to load balances!");
      console.error(error);
    }
  };

  const handleClaim = async () => {
    if (!selectedAccount) return;

    try {
      const api = await createApi();

      const injector = await web3FromAddress(selectedAccount.address);

      toast.loading("Claiming vesting...");

      await api.tx.vesting
        .claim()
        .signAndSend(
          selectedAccount.address,
          { signer: injector.signer },
          () => {
            loadBalances(selectedAccount);
          }
        );

      toast.dismiss();

      toast.success("Claimed vesting!");
    } catch (error) {
      toast.dismiss();

      toast.error("Failed to claim vesting!");

      console.error(error);
    }
  };

  useEffect(() => {
    if (!selectedAccount) return;

    loadBalances(selectedAccount);
  }, [selectedAccount]);

  return (
    <div className="relative flex h-[calc(100vh_-_12rem)] items-center justify-center overflow-hidden">
      <div
        className="hidden md:absolute md:inset-y-0 md:block md:h-full md:w-full"
        aria-hidden="true"
      >
        <div className="mx-auto h-full max-w-7xl">
          <img
            src={background}
            alt="background"
            className="absolute right-full translate-y-0 translate-x-1/3 transform "
          />
          <img
            src={background}
            alt="background"
            className="absolute left-full translate-y-0 -translate-x-1/3 transform"
          />
        </div>
      </div>

      <div className="z-10 w-full py-6 px-8 sm:max-w-3xl">
        {!selectedAccount ? (
          <div className="text-center">
            <h1 className="text-2xl font-bold text-white">
              Wallet not connected
            </h1>
            <p className="mt-8 text-lg text-white">
              You can connect your wallet to claim your vested tokens.
            </p>
          </div>
        ) : null}

        {isLoading ? (
          <div className="flex items-center justify-center">
            <LoadingSpinner />
          </div>
        ) : null}

        {!isLoading && selectedAccount && vestingData ? (
          <div className="overflow-hidden rounded-md border border-gray-50 bg-black shadow">
            <div className="p-4 sm:grid sm:w-full sm:grid-cols-2 sm:px-6">
              <div className="flex flex-col p-6">
                <span className="text-lg font-normal text-white">
                  Claimable
                </span>
                <span className="text-2xl font-bold text-white">
                  {vestingData.vestedClaimable}
                </span>
                <button
                  type="button"
                  className="mt-8 inline-flex items-center justify-center rounded-md border border-amber-300 bg-amber-300 px-4 py-2 text-base font-medium text-black shadow-sm focus:outline-none focus:ring-2 focus:ring-neutral-500 focus:ring-offset-2 disabled:opacity-75"
                  onClick={() => handleClaim()}
                  disabled={vestingData.vestedClaimable === "0"}
                >
                  Claim Now
                </button>
              </div>

              <div className="flex flex-col p-6">
                <span className="text-lg font-normal text-white">Vesting</span>
                <span className="text-2xl font-bold text-white">
                  {vestingData.vestedLocked}
                </span>
                <span className="mt-8 text-sm text-white">
                  Vesting period remaining:
                </span>
                <span className="text-sm text-white">
                  {vestingData.remainingVestingPeriod} blocks
                </span>
              </div>
            </div>

            <div className="border-t border-gray-50 px-4 py-5 sm:grid sm:w-full sm:grid-cols-2 sm:px-6">
              <div className="px-6">
                <span className="text-sm font-bold leading-6 text-white">
                  Transferable:
                </span>{" "}
                <span className="text-lg font-bold leading-6 text-white">
                  {vestingData.transferable}
                </span>
              </div>

              <div className="px-6">
                <span className="text-sm font-bold leading-6 text-white">
                  Total:
                </span>{" "}
                <span className="text-lg font-bold leading-6 text-white">
                  {vestingData.total}
                </span>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default Home;
