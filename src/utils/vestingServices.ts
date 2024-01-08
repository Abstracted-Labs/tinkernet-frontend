import { formatBalance } from "@polkadot/util";
import BigNumber from "bignumber.js";
import { VestingScheduleLineItem, DataResultType, LockType, SystemAccount, VestingSchedule } from "../routes/claim";
import { ApiPromise } from "@polkadot/api";
import { InjectedAccountWithMeta } from "@polkadot/extension-inject/types";

export const fetchSystemData = async (selectedAccount: InjectedAccountWithMeta, api: ApiPromise): Promise<DataResultType> => {
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

export const calculateVestingSchedule = async (vestingSchedules: VestingSchedule[], api: ApiPromise, currentDate: Date = new Date(), averageBlockTimeInSeconds: number = 12): Promise<VestingScheduleLineItem[]> => {
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

export const calculateVestingData = (results: DataResultType, vestingSchedules: VestingSchedule[], currentDate: Date = new Date(), averageBlockTimeInSeconds: number = 12) => {
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
    vestedClaimable: formatBalance(unlockedClaimableTokens.toString(), { decimals: 12, withUnit: "TNKR", forceUnit: "-" }),
    vestedRemaining: formatBalance(totalFutureLockedTokens.toString(), { decimals: 12, withUnit: "TNKR", forceUnit: "-" }),
    frozen: formatBalance(frozen.toString(), { decimals: 12, withUnit: "TNKR", forceUnit: "-" }),
    available: formatBalance(available.toString(), { decimals: 12, withUnit: "TNKR", forceUnit: "-" }),
    remainingVestingPeriod: new Intl.NumberFormat("en-US", {}).format(remainingVestingPeriod),
    endOfVestingPeriod
  };
};