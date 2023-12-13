import "@polkadot/api-augment";
import { web3Enable, web3FromAddress } from "@polkadot/extension-dapp";
import { InjectedAccountWithMeta } from "@polkadot/extension-inject/types";
import { useEffect, useRef, useState } from "react";
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
import Button from "../components/Button";

type SystemAccount = Struct & {
  data: {
    free: BN;
    reserved: BN;
    frozen: BN;
  };
};

type VestingData = {
  vestedClaimable: string;
  vestedRemaining: string;
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
  payoutDate: number;
  payoutAmount: string;
};

type DataResultType = [unknown, unknown, unknown, unknown] | undefined;

type CoreDataType = {
  account: string;
  metadata: {
    name: string;
    description: string;
    image: string;
  };
};

interface LockType {
  id: {
    toHuman: () => string;
  };
  amount: {
    toString: () => string;
  };
}

type StakeInfo = { era: string; staked: string; }[];

export type StakesInfo = { stakes: StakeInfo; };

const Home = () => {
  const totalInitialVestment = useRef("0");
  const { selectedAccount } = useAccount(
    (state) => ({ selectedAccount: state.selectedAccount }),
    shallow
  );
  const [vestingSummary, setVestingSummary] = useState<VestingData | null>(null);
  const [payoutSchedule, setPayoutSchedule] = useState<VestingScheduleLineItem[]>([]);
  const [isBalanceLoading, setBalanceLoading] = useState(false);
  const [isClaimWaiting, setClaimWaiting] = useState(false);
  const [totalStakedTNKR, setTotalStakedTNKR] = useState<string>('0');
  const api = useApi();

  const averageBlockTimeInSeconds = 12; // Average block time on Tinkernet
  const currentDate = new Date();
  const dateOptions = {
    year: 'numeric' as const,
    month: 'long' as const,
    day: 'numeric' as const
  };

  let vestingCompletionDate = '--';
  if (payoutSchedule.length > 0 && payoutSchedule.every(s => !isNaN(s.payoutDate))) {
    const maxPayoutDate = Math.max(...payoutSchedule.map(s => s.payoutDate));
    vestingCompletionDate = new Date(maxPayoutDate).toLocaleString('en-US', dateOptions);
  }

  const loadStakedTNKR = async (selectedAccount: InjectedAccountWithMeta | null) => {
    try {
      const currentEra = (await api.query.ocifStaking.currentEra()).toPrimitive() as number;
      const stakingCores = (await api.query.ocifStaking.registeredCore.entries()).map(([{ args: [key] }, core]) => {
        const coreData = core.toPrimitive() as CoreDataType;
        const coreKey = key.toPrimitive() as number;

        return {
          key: coreKey,
          ...coreData,
        };
      });

      if (selectedAccount) {
        const userStakeInfo: { coreId: number; era: number; staked: BigNumber; }[] = [];
        let unclaimedCores = { cores: [] as { coreId: number; earliestEra: number; }[], total: 0 };

        for (const core of stakingCores) {
          const stakerInfo = await api.query.ocifStaking.generalStakerInfo(core.key, selectedAccount.address);
          const info = stakerInfo.toPrimitive() as StakesInfo;

          if (info.stakes.length > 0) {
            const earliestUnclaimedEra = parseInt(info.stakes[0].era);

            if (earliestUnclaimedEra < currentEra) {
              const updatedCores = unclaimedCores.cores.filter((value) => value.coreId !== core.key);
              updatedCores.push({ coreId: core.key, earliestEra: earliestUnclaimedEra });

              const total = Math.max(unclaimedCores.total, currentEra - earliestUnclaimedEra);

              unclaimedCores = { cores: updatedCores, total };
            }

            const latestStake = info.stakes.at(-1);

            if (latestStake) {
              userStakeInfo.push({
                coreId: core.key,
                era: parseInt(latestStake.era),
                staked: new BigNumber(latestStake.staked),
              });
            }
          }
        }

        const totalUserStaked = userStakeInfo.reduce((acc, cur) => acc.plus(cur.staked), new BigNumber(0));

        const formattedStaked = formatBalance(totalUserStaked.toString(), { decimals: 12, withUnit: "TNKR", forceUnit: "-" });

        setTotalStakedTNKR(formattedStaked.toString());
      }
    } catch (error) {
      toast.error(`${ error }`);
    }
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

  const calculateVestingSchedule = async (vestingSchedules: VestingSchedule[]): Promise<VestingScheduleLineItem[]> => {
    // Fetch the current block number from the blockchain.
    const currentBlock = new BigNumber((await api.query.system.number()).toString());

    // Sort the vesting schedules by the end block of each vesting period in ascending order.
    return vestingSchedules.sort((a, b) => (a.start + a.period * a.periodCount) - (b.start + b.period * b.periodCount)).map(schedule => {
      // Convert the start block, period, perPeriod, and periodCount of each vesting schedule to BigNumber for accurate calculations.
      const vestingStartBlock = new BigNumber(schedule.start);
      const blocksPerPayout = new BigNumber(schedule.period);
      const tokensPerPayout = new BigNumber(schedule.perPeriod);
      const totalPayouts = new BigNumber(schedule.periodCount);

      // Calculate the end block of the vesting period.
      const endBlock = vestingStartBlock.plus(blocksPerPayout.multipliedBy(totalPayouts.toNumber()));

      // Calculate the estimated payout date in seconds since the Unix Epoch.
      const payoutDateInSeconds = currentDate.getTime() / 1000 + averageBlockTimeInSeconds * (endBlock.minus(currentBlock).toNumber());

      // Convert the payout date to a JavaScript Date object.
      const payoutDate = new Date(payoutDateInSeconds * 1000).getTime();

      // Calculate the total amount of tokens to be paid out.
      const payoutAmount = tokensPerPayout.multipliedBy(totalPayouts).toString();

      // Return a VestingScheduleLineItem object for each vesting schedule.
      return {
        payoutDate,
        payoutAmount
      };
    });
  };

  const calculateVestingData = (results: DataResultType, vestingSchedules: VestingSchedule[]) => {
    if (!results) {
      throw new Error("Results is undefined");
    }

    if (!totalStakedTNKR) {
      throw new Error("totalStakedTNKR is undefined or null");
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
      vestedClaimable: formatBalance(unlockedClaimableTokens.toString(), { decimals: 12, withUnit: "TNKR", forceUnit: "-" }),
      vestedRemaining: formatBalance(totalFutureLockedTokens.toString(), { decimals: 12, withUnit: "TNKR", forceUnit: "-" }),
      frozen: formatBalance(frozen.toString(), { decimals: 12, withUnit: "TNKR", forceUnit: "-" }),
      available: formatBalance(available.toString(), { decimals: 12, withUnit: "TNKR", forceUnit: "-" }),
      remainingVestingPeriod: new Intl.NumberFormat("en-US", {}).format(remainingVestingPeriod),
      endOfVestingPeriod
    };
  };

  const loadBalances = async (selectedAccount: InjectedAccountWithMeta) => {
    setBalanceLoading(true);

    try {
      await loadStakedTNKR(selectedAccount);
      const results = await fetchData(selectedAccount);
      if (!results) {
        console.error("Failed to fetch data");
        return;
      }
      const vestingSchedules = results[1] as unknown as VestingSchedule[];
      const vestingScheduleData = await calculateVestingSchedule(vestingSchedules);
      const vestingData = calculateVestingData(results, vestingSchedules);

      // Calculate total remaining vesting
      const remainingVesting = vestingScheduleData.reduce((total, item) => {
        const amount = new BigNumber(item.payoutAmount);
        return total.plus(amount);
      }, new BigNumber(0));

      // Format the total remaining vesting amount
      totalInitialVestment.current = formatBalance(remainingVesting.toString(), { decimals: 12, withUnit: "TNKR", forceUnit: "-" });

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
    <div className="relative flex flex-row items-center justify-center overflow-hidden">
      <div className="z-10 w-full p-4 sm:max-w-3xl mt-10">
        <h2 className="lg:text-xl font-bold my-3">
          <span>Claim</span>
        </h2>

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
          <div className="overflow-hidden rounded-md border border-gray-50 backdrop-blur-sm shadow">
            <div className="p-4 sm:grid sm:w-full sm:grid-cols-2 sm:px-6">
              <div className="flex flex-col justify-start p-6">
                <span className="text-lg font-normal text-white">
                  Ready to Claim
                </span>
                <span className="text-2xl font-bold text-white">
                  {vestingSummary.vestedClaimable}
                </span>
                <Button
                  variant="primary"
                  type="button"
                  onClick={() => handleClaim(selectedAccount)}
                  disabled={vestingSummary.vestedClaimable === "0" || isClaimWaiting}
                >
                  {vestingSummary.vestedClaimable === "0" ? 'Nothing to Claim' : 'Claim Now'}
                </Button>
              </div>

              <div className="flex flex-col p-6">
                <span className="text-lg font-normal text-white">
                  Remaining Vesting
                </span>
                <span className="text-2xl font-bold text-white">
                  {vestingSummary.vestedRemaining}
                </span>
                <span className="mt-8 text-sm text-white">
                  Total Vesting:
                </span>
                <span className="text-sm text-white">
                  {totalInitialVestment.current}
                </span>
                <span className="mt-8 text-sm text-white">
                  Vesting Completion Date:
                </span>
                <span className="text-sm text-white">
                  {vestingCompletionDate}
                </span>
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
                  {totalStakedTNKR}
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
