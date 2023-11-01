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
  endOfVestingPeriod: Date;
};

type VestingSchedule = {
  start: number;
  period: number;
  periodCount: number;
  perPeriod: number;
};

type VestingScheduleLineItem = {
  payoutDate: Date;
  payoutAmount: string;
};

type DataResultType = [unknown, unknown, unknown, unknown] | undefined;

interface LockType {
  id: {
    toHuman: () => string;
  };
  amount: {
    toString: () => string;
  };
}

const Home = () => {
  const { selectedAccount } = useAccount(
    (state) => ({ selectedAccount: state.selectedAccount }),
    shallow
  );
  const [vestingSummary, setVestingSummary] = useState<VestingData | null>(null);
  const [payoutSchedule, setPayoutSchedule] = useState<VestingScheduleLineItem[]>([]);
  const [isBalanceLoading, setBalanceLoading] = useState(false);
  const [isClaimWaiting, setClaimWaiting] = useState(false);
  const api = useApi();

  const averageBlockTimeInSeconds = 12; // Average block time on Tinkernet
  const currentDate = new Date();
  const dateOptions = {
    year: 'numeric' as const,
    month: 'long' as const,
    day: 'numeric' as const
  };

  const fetchData = async (selectedAccount: InjectedAccountWithMeta): Promise<DataResultType> => {
    if (!selectedAccount || !api) {
      console.error("Selected account or API is not defined");
      return undefined;
    }

    return await Promise.all([
      // vesting locks
      api.query.balances.locks(selectedAccount.address),
      // vesting schedules
      api.query.vesting.vestingSchedules(selectedAccount.address),
      // current block
      api.query.system.number(),
      // available account data
      api.query.system.account<SystemAccount>(selectedAccount.address),
    ]);
  };

  const calculateVestingSchedule = (vestingSchedules: VestingSchedule[]): VestingScheduleLineItem[] => {
    return vestingSchedules.map(schedule => {
      const vestingStartBlock = new BigNumber(schedule.start);
      const blocksPerPayout = new BigNumber(schedule.period);
      const tokensPerPayout = new BigNumber(schedule.perPeriod / 1000000000000);
      const totalPayouts = new BigNumber(schedule.periodCount);

      const payoutDates = Array.from({ length: totalPayouts.toNumber() }, (_, i) => {
        const payoutBlock = vestingStartBlock.plus(blocksPerPayout.multipliedBy(i));
        const payoutDateInSeconds = currentDate.getTime() / 1000 - payoutBlock.multipliedBy(averageBlockTimeInSeconds).toNumber();
        return new Date(payoutDateInSeconds * 1000);
      });

      const payoutAmount = tokensPerPayout.toString();

      return payoutDates.map(date => ({
        payoutDate: date,
        payoutAmount
      }));
    }).flat();
  };

  const calculateVestingData = (results: DataResultType, vestingSchedules: VestingSchedule[]) => {
    if (!results) {
      throw new Error("Results is undefined");
    }

    // Calculate the amount of tokens that are currently vested
    const vestedLockedTokens = new BigNumber(
      results[0]
        ? (results[0] as LockType[]).find((lock) => lock.id.toHuman() === "ormlvest")?.amount.toString() || "0"
        : "0"
    );

    // Set the current block
    const currentBlock = results[2] || 0;

    // Calculate the remaining vesting period
    const remainingVestingPeriod = vestingSchedules.length
      ? vestingSchedules[0].periodCount -
      (parseInt(currentBlock.toString()) - vestingSchedules[0].start)
      : 0;

    // Initialize the total amount of tokens that are still locked into the future
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

      // Calculate the amount of tokens that are still locked into the future
      const futureLockedTokens = totalLockedTokens.minus(tokensUnlockedSoFar);

      // Add the future locked tokens to the total future locked amount
      totalFutureLockedTokens = totalFutureLockedTokens.plus(futureLockedTokens);
    }

    // Calculate the amount of tokens that are currently claimable
    const unlockedClaimableTokens = vestedLockedTokens.minus(totalFutureLockedTokens);

    // Calculate the total amount of tokens
    const total = results[3] ? new BigNumber(((results[3] as unknown) as SystemAccount).data.free.toString()) : new BigNumber("0");

    // Calculate the amount of tokens that are currently frozen
    const frozen = results[3] ? new BigNumber(((results[3] as unknown) as SystemAccount).data.frozen.toString()) : new BigNumber("0");

    // Calculate the amount of tokens that are currently available
    const available = total.minus(frozen);

    // Convert block time to seconds
    const remainingVestingPeriodInSeconds = remainingVestingPeriod * averageBlockTimeInSeconds;

    // Calculate the end of the vesting period
    const endOfVestingPeriod = new Date(currentDate.getTime() + remainingVestingPeriodInSeconds * 1000);

    return {
      vestedLocked: formatBalance(vestedLockedTokens.toString(), { decimals: 12, withUnit: "TNKR", forceUnit: "-" }),
      vestedClaimable: formatBalance(unlockedClaimableTokens.toString(), { decimals: 12, withUnit: "TNKR", forceUnit: "-" }),
      frozen: formatBalance(frozen.toString(), { decimals: 12, withUnit: "TNKR", forceUnit: "-" }),
      available: formatBalance(available.toString(), { decimals: 12, withUnit: "TNKR", forceUnit: "-" }),
      remainingVestingPeriod: new Intl.NumberFormat("en-US", {}).format(remainingVestingPeriod),
      endOfVestingPeriod
    };
  };

  const loadBalances = async (selectedAccount: InjectedAccountWithMeta) => {
    setBalanceLoading(true);

    try {
      const results = await fetchData(selectedAccount);
      if (!results) {
        console.error("Failed to fetch data");
        return;
      }
      const vestingSchedules = results[1] as unknown as VestingSchedule[];
      const vestingScheduleData = calculateVestingSchedule(vestingSchedules);
      const vestingData = calculateVestingData(results, vestingSchedules);

      setPayoutSchedule(vestingScheduleData);
      setVestingSummary(vestingData);

      toast.dismiss();
      setBalanceLoading(false);
      toast.success("Balances loaded");
    } catch (error) {
      toast.dismiss();
      setBalanceLoading(false);
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
            setClaimWaiting(false);
          },
          onExecuted: () => {
            toast.dismiss();
            toast.loading("Waiting for confirmation...");
            setClaimWaiting(true);
          },
          onSuccess: () => {
            toast.dismiss();
            toast.success("Claimed successfully");
            loadBalances(selectedAccount);
            setClaimWaiting(false);
          },
          onDropped: () => {
            toast.dismiss();
            toast.error("Transaction dropped");
            setClaimWaiting(false);
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
    <div className="relative flex md:h-[calc(100vh_-_12rem)] items-center justify-center overflow-hidden">
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

      <div className="z-10 w-full py-6 px-8 sm:max-w-3xl md:mt-10">
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

        {isBalanceLoading ? (
          <div className="flex items-center justify-center">
            <LoadingSpinner />
          </div>
        ) : null}

        {!isBalanceLoading && selectedAccount && vestingSummary ? (
          <div className="overflow-hidden rounded-md border border-gray-50 bg-neutral-900 shadow">
            <div className="p-4 sm:grid sm:w-full sm:grid-cols-2 sm:px-6">
              <div className="flex flex-col p-6">
                <span className="text-lg font-normal text-white">
                  Unlocked Tokens
                </span>
                <span className="text-2xl font-bold text-white">
                  {vestingSummary.vestedClaimable}
                </span>
                <button
                  type="button"
                  className="mt-8 inline-flex items-center justify-center rounded-md border border-amber-300 bg-amber-300 px-4 py-2 text-base font-medium text-black shadow-sm focus:outline-none focus:ring-2 focus:ring-neutral-500 focus:ring-offset-2 disabled:opacity-75"
                  onClick={() => handleClaim(selectedAccount)}
                  disabled={vestingSummary.vestedClaimable === "0" || isClaimWaiting}
                >
                  Claim Now
                </button>
              </div>

              <div className="flex flex-col p-6">
                <span className="text-lg font-normal text-white">Vesting</span>
                <span className="text-2xl font-bold text-white">
                  {vestingSummary.vestedLocked}
                </span>
                <span className="mt-8 text-sm text-white">
                  Vesting period remaining:
                </span>
                <span className="text-sm text-white">
                  {vestingSummary.remainingVestingPeriod} blocks <br />
                </span>
                {payoutSchedule.length ? (
                  <>
                    <span className="mt-8 text-sm text-white">
                      Latest unlocked date:
                    </span>
                    <span className="text-sm text-white">
                      {payoutSchedule[0].payoutDate.toLocaleString('en-US', dateOptions)}
                    </span>
                    <span className="mt-8 text-sm text-white">
                      Latest unlocked amount:
                    </span>
                    <span className="text-sm text-white">
                      {payoutSchedule[0].payoutAmount} TNKR
                    </span>
                  </>
                ) : null}
              </div>
            </div>

            <div className="border-t border-gray-50 px-4 py-5 sm:grid sm:w-full sm:grid-cols-2 sm:px-6">
              <div className="px-6 py-2">
                <span className="text-sm font-bold leading-6 text-white">
                  Available:
                </span>{" "}
                <span className="text-lg font-bold leading-6 text-white">
                  {vestingSummary.available}
                </span>
              </div>

              <div className="px-6 py-2">
                <span className="text-sm font-bold leading-6 text-white">
                  Staked:
                </span>{" "}
                <span className="text-lg font-bold leading-6 text-white">
                  {vestingSummary.frozen}
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
