import "@polkadot/api-augment";
import { web3Enable, web3FromAddress } from "@polkadot/extension-dapp";
import { InjectedAccountWithMeta } from "@polkadot/extension-inject/types";
import { useEffect, useRef, useState, useCallback } from "react";
import { BN, formatBalance } from "@polkadot/util";
import { Struct } from "@polkadot/types";
import BigNumber from "bignumber.js";
import { toast } from "react-hot-toast";
import useAccount from "../stores/account";
import { shallow } from "zustand/shallow";
import LoadingSpinner from "../components/LoadingSpinner";
import useApi from "../hooks/useApi";
import Button from "../components/Button";
import { calculateVestingSchedule, calculateVestingData, fetchSystemData } from "../utils/vestingServices";
import { loadProjectCores } from "../utils/stakingServices";
import { getSignAndSendCallbackWithPromise } from "../utils/getSignAndSendCallback";
import { CoreEraType } from "./staking";

export type SystemAccount = Struct & {
  data: {
    free: BN;
    reserved: BN;
    frozen: BN;
  };
};

export type VestingData = {
  vestedClaimable: string;
  vestedRemaining: string;
  frozen: string;
  available: string;
  remainingVestingPeriod: string;
  endOfVestingPeriod: Date;
};

export type VestingSchedule = {
  start: number;
  period: number;
  periodCount: number;
  perPeriod: number;
};

export type VestingScheduleLineItem = {
  payoutDate: number;
  payoutAmount: string;
};

export type DataResultType = [unknown, unknown, unknown, unknown] | undefined;

export type CoreDataType = {
  account: string;
  metadata: {
    name: string;
    description: string;
    image: string;
  };
};

export interface LockType {
  id: {
    toHuman: () => string;
  };
  amount: {
    toString: () => string;
  };
}

export type StakeInfo = { era: string; staked: string; }[];

export type StakesInfo = { stakes: StakeInfo; };

const Claim = () => {
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

  const loadStakedTNKR = useCallback(async (selectedAccount: InjectedAccountWithMeta | null) => {
    try {
      const currentEra = (await api.query.ocifStaking.currentEra()).toPrimitive() as number;
      const stakingCores = await loadProjectCores(api);

      if (selectedAccount && stakingCores) {
        const userStakeInfo: { coreId: number; era: number; staked: BigNumber; }[] = [];
        let unclaimedCores = { cores: [] as CoreEraType[], total: 0 };

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
  }, [api]);

  const loadBalances = useCallback(async (selectedAccount: InjectedAccountWithMeta) => {
    setBalanceLoading(true);

    try {
      toast.loading("Loading balances...");
      await loadStakedTNKR(selectedAccount);
      const results = await fetchSystemData(selectedAccount, api);
      if (!results) {
        console.error("Failed to fetch data");
        return;
      }
      const vestingSchedules = results[1] as unknown as VestingSchedule[];
      const vestingScheduleData = await calculateVestingSchedule(vestingSchedules, api);
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
  }, [api, loadStakedTNKR]);

  const handleClaim = async (selectedAccount: InjectedAccountWithMeta) => {
    try {
      web3Enable("Tinkernet");

      const injector = await web3FromAddress(selectedAccount.address);

      toast.loading("Claiming vesting...");

      await api.tx.vesting.claim().signAndSend(
        selectedAccount.address,
        { signer: injector.signer },
        getSignAndSendCallbackWithPromise({
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
  }, [selectedAccount, loadBalances]);

  return (
    <div className="mx-auto w-full flex max-w-7xl flex-col justify-between p-4 sm:px-6 lg:px-8 mt-14 md:mt-0 gap-3">
      <div className="z-10 w-full">
        <h2 className="lg:text-xl font-bold mt-[8px] lg:mt-[12px] mb-[20px] lg:mb-[24px] flex flex-row items-center gap-4">
          <span>Claim Vesting</span>
          <span>{isBalanceLoading ? <LoadingSpinner /> : null}</span>
        </h2>

        {!selectedAccount ? (
          <div className="text-center">
            <h5 className="text-sm font-bold text-white">
              Wallet not connected
            </h5>
            <p className="mt-2 text-xs text-white">
              Connect your wallet to claim any vested tokens.
            </p>
          </div>
        ) : null}

        {!isBalanceLoading && selectedAccount && vestingSummary ? (
          <div className="overflow-hidden rounded-md border border-gray-50 backdrop-blur-sm shadow">
            <div className="p-4 sm:grid sm:w-full sm:grid-cols-2 sm:px-6">
              <div className="flex flex-col-reverse sm:flex-col justify-between p-6 gap-4">
                <div className="flex flex-col">
                  <span className="text-lg font-normal text-white">
                    Ready to Claim
                  </span>
                  <span className="text-2xl font-bold text-white">
                    {vestingSummary.vestedClaimable}
                  </span>
                </div>
                <div>
                  <Button
                    variant="primary"
                    type="button"
                    onClick={() => handleClaim(selectedAccount)}
                    disabled={vestingSummary.vestedClaimable === "0" || isClaimWaiting}
                  >
                    {vestingSummary.vestedClaimable === "0" ? 'Nothing to Claim' : 'Claim Now'}
                  </Button>
                </div>
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

export default Claim;
