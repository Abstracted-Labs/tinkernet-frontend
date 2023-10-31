import "@polkadot/api-augment";
import { web3Enable, web3FromAddress } from "@polkadot/extension-dapp";
import { InjectedAccountWithMeta } from "@polkadot/extension-inject/types";
import { useEffect, useState } from "react";
import { BN, formatBalance } from "@polkadot/util";
import { Struct } from "@polkadot/types";
import BigNumber from "bignumber.js";
import background from "../assets/background.svg";
import { toast } from "react-hot-toast";
import useAccount from "../stores/account";
import { shallow } from "zustand/shallow";
import LoadingSpinner from "../components/LoadingSpinner";
import getSignAndSendCallback from "../utils/getSignAndSendCallback";
import useApi from "../hooks/useApi";

type SystemAccount = Struct & {
  data: {
    free: BN;
    reserved: BN;
    frozen: BN;
  };
};

type VestingData = {
  vestedLocked: string;
  vestedClaimable: string;
  frozen: string;
  available: string;
  remainingVestingPeriod: string;
};

const Home = () => {
  const { selectedAccount } = useAccount(
    (state) => ({ selectedAccount: state.selectedAccount }),
    shallow
  );
  const [vestingData, setVestingData] = useState<VestingData | null>(null);
  const [isLoading, setLoading] = useState(false);
  const [isWaiting, setWaiting] = useState(false);
  const api = useApi();

  const loadBalances = async (selectedAccount: InjectedAccountWithMeta) => {
    setLoading(true);

    try {
      const results = await Promise.all([
        // vested locked
        api.query.balances.locks(selectedAccount.address),
        // vesting schedules
        api.query.vesting.vestingSchedules(selectedAccount.address),
        // current block
        api.query.system.number(),
        // available
        api.query.system.account<SystemAccount>(selectedAccount.address),
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

      const unclaimedVested = vestingSchedules.reduce((acc) => acc, new BigNumber("0"));

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

      const claimableTNKR = vestedLocked.minus(unclaimedVested);

      const total = new BigNumber(results[3].data.free.toString());

      const frozen = new BigNumber(results[3].data.frozen.toString());

      const available = total.minus(frozen);

      setVestingData({
        vestedLocked: formatBalance(vestedLocked.toString(), {
          decimals: 12,
          withUnit: "TNKR",
          forceUnit: "-",
        }),
        vestedClaimable: formatBalance(claimableTNKR.toString(), {
          decimals: 12,
          withUnit: "TNKR",
          forceUnit: "-",
        }),
        frozen: formatBalance(frozen.toString(), {
          decimals: 12,
          withUnit: "TNKR",
          forceUnit: "-",
        }),
        available: formatBalance(available.toString(), {
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

  const handleClaim = async (selectedAccount: InjectedAccountWithMeta) => {
    try {
      web3Enable("Tinkernet");

      const injector = await web3FromAddress(selectedAccount.address);

      toast.loading("Claiming vesting...");

      await api.tx.vesting.claim().signAndSend(
        selectedAccount.address,
        { signer: injector.signer },
        getSignAndSendCallback({
          onInvalid: () => {
            toast.dismiss();

            toast.error("Invalid transaction");

            setWaiting(false);
          },
          onExecuted: () => {
            toast.dismiss();

            toast.loading("Waiting for confirmation...");

            setWaiting(true);
          },
          onSuccess: () => {
            toast.dismiss();

            toast.success("Claimed successfully");

            loadBalances(selectedAccount);

            setWaiting(false);
          },
          onDropped: () => {
            toast.dismiss();

            toast.error("Transaction dropped");

            setWaiting(false);
          },
        })
      );

      toast.dismiss();
    } catch (error) {
      toast.dismiss();

      toast.error(`${ error }`);

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
            className="pointer-events-none absolute right-full translate-y-0 translate-x-1/3 transform"
          />
          <img
            src={background}
            alt="background"
            className="pointer-events-none absolute left-full translate-y-0 -translate-x-1/3 transform"
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
          <div className="overflow-hidden rounded-md border border-gray-50 bg-neutral-900 shadow">
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
                  onClick={() => handleClaim(selectedAccount)}
                  disabled={vestingData.vestedClaimable === "0" || isWaiting}
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
              <div className="px-6 py-2">
                <span className="text-sm font-bold leading-6 text-white">
                  Available:
                </span>{" "}
                <span className="text-lg font-bold leading-6 text-white">
                  {vestingData.available}
                </span>
              </div>

              <div className="px-6 py-2">
                <span className="text-sm font-bold leading-6 text-white">
                  Staked:
                </span>{" "}
                <span className="text-lg font-bold leading-6 text-white">
                  {vestingData.frozen}
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
