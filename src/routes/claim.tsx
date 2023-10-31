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
    // Check if selectedAccount and api are defined
    if (!selectedAccount) {
      console.error("Selected account is not defined");
      return;
    }

    if (!api) {
      console.error("API is not defined");
      return;
    }

    setLoading(true);

    try {
      const results = await Promise.all([
        // vesting locks
        api.query.balances.locks(selectedAccount.address),
        // vesting schedules
        api.query.vesting.vestingSchedules(selectedAccount.address),
        // current block
        api.query.system.number(),
        // available account data
        api.query.system.account<SystemAccount>(selectedAccount.address),
      ]);

      // Check if results are defined and have the expected length
      if (!results) {
        console.error("Results are undefined");
        return;
      }

      if (results.length !== 4) {
        console.error("Results do not have the expected length");
        return;
      }

      // Calculate the amount of tokens that are currently vested
      const vestedLocked = new BigNumber(
        results[0]
          .find((lock) => lock.id.toHuman() === "ormlvest")
          ?.amount.toString() || "0"
      );

      // Set the vesting schedules
      const vestingSchedules = results[1] as unknown as {
        start: number;
        period: number;
        periodCount: number;
        perPeriod: number;
      }[];

      // Set the current block
      const currentBlock = results[2];

      // Calculate the remaining vesting period
      const remainingVestingPeriod = vestingSchedules.length
        ? vestingSchedules[0].periodCount -
        (parseInt(currentBlock.toString()) - vestingSchedules[0].start)
        : 0;

      // Initialize the total amount of tokens that will be locked in the future
      let totalFutureLockedTokens = new BigNumber("0");

      // Iterate over each vesting schedule
      for (const schedule of vestingSchedules) {
        // Convert all relevant data to BigNumber for consistent calculations
        const vestingStartBlock = new BigNumber(schedule.start);
        const blocksPerPayout = new BigNumber(schedule.period);
        const tokensPerPayout = new BigNumber(schedule.perPeriod);
        const totalPayouts = new BigNumber(schedule.periodCount);
        const currentBlockNumber = new BigNumber(currentBlock.toString());

        // Calculate the number of payouts that have occurred since the start of the vesting
        let payoutsOccurred = currentBlockNumber.isGreaterThanOrEqualTo(vestingStartBlock)
          ? currentBlockNumber.minus(vestingStartBlock).dividedBy(blocksPerPayout).integerValue(BigNumber.ROUND_DOWN)
          : new BigNumber("0");

        // Ensure the number of payouts is not negative
        payoutsOccurred = payoutsOccurred.isNegative() ? new BigNumber("0") : payoutsOccurred;

        // Calculate the total amount of tokens vested over the occurred payouts
        const tokensVestedSoFar = payoutsOccurred.multipliedBy(tokensPerPayout);

        // Calculate the total amount of tokens that were originally locked
        const totalLockedTokens = totalPayouts.multipliedBy(tokensPerPayout);

        // Calculate the amount of tokens unlocked so far
        const tokensUnlockedSoFar = tokensVestedSoFar.gte(totalLockedTokens) ? totalLockedTokens : tokensVestedSoFar;

        // Calculate the amount of tokens that will be locked in the future
        const futureLockedTokens = totalLockedTokens.minus(tokensUnlockedSoFar);

        // Add the future locked tokens to the total amount
        totalFutureLockedTokens = totalFutureLockedTokens.plus(futureLockedTokens);
      }

      // Calculate the amount of tokens that are currently claimable
      const vestedClaimable = vestedLocked.minus(totalFutureLockedTokens);

      // Calculate the total amount of tokens
      const total = new BigNumber(results[3].data.free.toString());

      // Calculate the amount of tokens that are currently frozen
      const frozen = new BigNumber(results[3].data.frozen.toString());

      // Calculate the amount of tokens that are currently available
      const available = total.minus(frozen);

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
