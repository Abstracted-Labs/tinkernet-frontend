import { InjectedAccountWithMeta } from "@polkadot/extension-inject/types";
import { encodeAddress } from "@polkadot/util-crypto";
import BigNumber from "bignumber.js";
import { useCallback, useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import LoadingSpinner from "../components/LoadingSpinner";
import useApi from "../hooks/useApi";
import useAccount from "../stores/account";
import { useQuery } from "urql";
import { AnyJson, Codec } from "@polkadot/types/types";
import { StakesInfo, VestingData, VestingSchedule } from "./claim";
import MetricDashboard from "../components/MetricDashboard";
import { loadProjectDaos } from '../utils/stakingServices';
import { StakingDao, DaoEraStakeInfoType, UserStakedInfoType, BalanceType, LockedType, TotalRewardsClaimedQuery, TotalRewardsDaoClaimedQuery, UnclaimedErasType, StakedType } from "./staking";
import { calculateVestingData, fetchSystemData } from "../utils/vestingServices";
import DaoList from "../components/DaoList";

export type StakedDaoType = StakingDao & { members?: AnyJson; };

const Overview = () => {
  const api = useApi();
  const selectedAccount = useAccount((state) => state.selectedAccount);
  const [stakingDaos, setStakingDaos] = useState<StakingDao[]>([]);
  const [currentStakingEra, setCurrentStakingEra] = useState<number>(0);
  const [daoEraStakeInfo, setDaoEraStakeInfo] = useState<DaoEraStakeInfoType[]>([]);
  const [totalUserStaked, setTotalUserStaked] = useState<BigNumber>();
  const [aggregateStaked, setAggregateStaked] = useState<BigNumber>();
  const [unclaimedEras, setUnclaimedEras] = useState<UnclaimedErasType>({ daos: [], total: 0 });
  const [availableBalance, setAvailableBalance] = useState<BigNumber>();
  const [lockedBalance, setLockedBalance] = useState<BigNumber>();
  const [isLoading, setLoading] = useState(true);
  const [isDataLoaded, setDataLoaded] = useState(false);
  const [totalUnclaimed, setTotalUnclaimed] = useState<BigNumber>(new BigNumber(0));
  const [totalClaimed, setTotalClaimed] = useState<BigNumber>(new BigNumber(0));
  const [vestingSummary, setVestingSummary] = useState<VestingData | null>(null);
  const [totalStaked, setTotalStaked] = useState<BigNumber>();

  const [rewardsUserClaimedQuery] = useQuery({
    query: TotalRewardsClaimedQuery,
    variables: {
      accountId: selectedAccount
        ? encodeAddress(selectedAccount.address, 117)
        : null,
    },

    pause: !selectedAccount,
  });

  const [rewardsCoreClaimedQuery] = useQuery({
    query: TotalRewardsDaoClaimedQuery,
    variables: {},

    pause: !selectedAccount,
  });

  const setupSubscriptions = useCallback(async () => {
    if (!selectedAccount) {
      throw new Error("selectedAccount is null");
    };

    const userStakedInfoMap: Map<
      number, UserStakedInfoType
    > = new Map();

    if (daoEraStakeInfo && daoEraStakeInfo.length > 0) {
      for (const stakingDao of stakingDaos) {
        await api.query.ocifStaking.generalStakerInfo(
          stakingDao.key,
          selectedAccount.address,
          (generalStakerInfo: Codec) => {
            const info = generalStakerInfo.toPrimitive() as StakesInfo;
            const latestInfo = info.stakes.at(-1);

            let era = -1;
            let staked = new BigNumber(0);

            if (info.stakes.length > 0) {
              const unclaimedEarliest = info.stakes.reduce((p, v) => parseInt(p.era) < parseInt(v.era) ? p : v).era;

              if (parseInt(unclaimedEarliest) < currentStakingEra) {
                const unclaimed = unclaimedEras;
                const unclaimedCore = unclaimed.daos.find(value => value.daoId === stakingDao.key);

                if (unclaimedCore) {
                  unclaimedCore.earliestEra = parseInt(unclaimedEarliest);
                } else {
                  unclaimed.daos.push({
                    daoId: stakingDao.key,
                    earliestEra: parseInt(unclaimedEarliest),
                  });
                }

                let total = unclaimed.total;
                total = currentStakingEra - parseInt(unclaimedEarliest);

                setUnclaimedEras({
                  daos: unclaimed.daos,
                  total,
                });
              } else {
                setUnclaimedEras((unclaimedEras) => ({
                  ...unclaimedEras,
                  total: 0,
                }));
              }
            }

            if (latestInfo) {
              era = parseInt(latestInfo.era);
              staked = new BigNumber(latestInfo.staked);
            }

            userStakedInfoMap.set(stakingDao.key, {
              daoId: stakingDao.key,
              era: era,
              staked: staked,
            });

            const newTotalStaked = Array.from(
              userStakedInfoMap.values()
            ).reduce((acc, cur) => acc.plus(cur.staked), new BigNumber(0));
            setTotalUserStaked(newTotalStaked);
          }
        );
      }
    }
  }, [api, currentStakingEra, stakingDaos, unclaimedEras, selectedAccount, daoEraStakeInfo]);

  const loadAggregateStaked = useCallback(async () => {
    const totalIssuance = (await api.query.balances.totalIssuance()).toPrimitive() as string;
    const inactiveIssuance = (await api.query.balances.inactiveIssuance()).toPrimitive() as string;
    setAggregateStaked(new BigNumber(totalIssuance).minus(new BigNumber(inactiveIssuance)));
  }, [api]);

  const loadCores = useCallback(async () => {
    const daos = await loadProjectDaos(api);

    if (daos) {
      setStakingDaos(daos);
    }
  }, [api]);

  const loadAccountInfo = useCallback(async (selectedAccount: InjectedAccountWithMeta) => {
    const account = await api.query.system.account(selectedAccount.address);
    const balance = account.toPrimitive() as BalanceType;
    const locked = (await api.query.ocifStaking.ledger(selectedAccount.address)).toPrimitive() as LockedType;
    const currentBalance = new BigNumber(balance.data.free).minus(new BigNumber(locked.locked));

    setAvailableBalance(currentBalance);
    setLockedBalance(new BigNumber(balance.data.frozen));
  }, [api]);

  const loadCurrentEraAndStake = useCallback(async () => {
    const currentStakingEra = (await api.query.ocifStaking.currentEra()).toPrimitive() as number;
    const generalEraInfo = (await api.query.ocifStaking.generalEraInfo(currentStakingEra)).toPrimitive() as StakedType;
    const totalStaked = new BigNumber(generalEraInfo.staked);
    setCurrentStakingEra(currentStakingEra);
    setTotalStaked(totalStaked);
  }, [api]);

  const loadVestingBalance = useCallback(async (selectedAccount: InjectedAccountWithMeta | null) => {
    if (!selectedAccount) return;
    try {
      const results = await fetchSystemData(selectedAccount, api);
      if (!results) {
        console.error("Failed to fetch data");
        return;
      }
      const vestingSchedules = results[1] as unknown as VestingSchedule[];
      const vestingData = calculateVestingData(results, vestingSchedules);

      setVestingSummary(vestingData);
    } catch (error) {
      console.error(error);
    }
  }, [api]);


  const initializeData = useCallback(async (selectedAccount: InjectedAccountWithMeta | null) => {
    try {
      toast.loading("Loading staking daos...");

      if (selectedAccount) {
        await Promise.all([
          loadAccountInfo(selectedAccount),
          loadCurrentEraAndStake(),
          loadCores(),
          loadAggregateStaked(),
          loadVestingBalance(selectedAccount)
        ]);
      }
    } catch (error) {
      toast.dismiss();
      toast.error(`${error}`);
    } finally {
      toast.dismiss();
      toast.success("Loaded");
      setLoading(false);
      setDataLoaded(true);
    }
  }, [loadAccountInfo, loadCores, loadAggregateStaked, loadVestingBalance, loadCurrentEraAndStake]);

  useEffect(() => {
    const setup = async () => {
      if (selectedAccount && typeof setupSubscriptions === 'function') {
        await setupSubscriptions();
      }
    };
    setup();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAccount, stakingDaos, daoEraStakeInfo]);

  useEffect(() => {
    initializeData(selectedAccount);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAccount]);

  useEffect(() => {
    if (rewardsUserClaimedQuery.fetching || !selectedAccount?.address) return;

    if (!rewardsUserClaimedQuery.data?.stakers?.length) {
      setTotalClaimed(new BigNumber(0));
      setTotalUnclaimed(new BigNumber(0));
      return;
    }

    const rewardsClaimed = new BigNumber(
      rewardsUserClaimedQuery.data.stakers[0].totalRewards
    );
    setTotalClaimed(rewardsClaimed);

    const totalUnclaimed = new BigNumber(
      rewardsUserClaimedQuery.data.stakers[0].totalUnclaimed
    );
    setTotalUnclaimed(totalUnclaimed);
  }, [selectedAccount, rewardsUserClaimedQuery.fetching, rewardsUserClaimedQuery.data]);

  useEffect(() => {
    if (rewardsCoreClaimedQuery.fetching || !rewardsCoreClaimedQuery.data?.daos?.length || !selectedAccount?.address) return;

    const daoEraStakeInfoMap: DaoEraStakeInfoType[] = rewardsCoreClaimedQuery.data.daos;

    const uniqueCoreEraStakeInfo = daoEraStakeInfoMap.filter((core, index, self) =>
      index === self.findIndex((item) => item.daoId === core.daoId)
    );

    setDaoEraStakeInfo(uniqueCoreEraStakeInfo);
  }, [selectedAccount, stakingDaos, rewardsCoreClaimedQuery.data, rewardsCoreClaimedQuery.fetching]);

  return (
    <div className="mx-auto w-full flex max-w-7xl flex-col justify-between p-4 sm:px-6 lg:px-8 mt-14 md:mt-0 gap-3">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
        <h2 className="lg:text-xl font-bold leading-none my-3 flex flex-row items-center gap-4">
          <span>Account Overview</span>
          <span>{isLoading || !isDataLoaded ? <LoadingSpinner /> : null}</span>
        </h2>
      </div>
      {selectedAccount ? (
        <div>
          <MetricDashboard
            isOverview={true}
            vestingBalance={vestingSummary?.vestedRemaining || "0"}
            availableBalance={availableBalance || new BigNumber(0)}
            lockedBalance={lockedBalance || new BigNumber(0)}
            aggregateStaked={aggregateStaked || new BigNumber(0)}
            totalUserStaked={totalUserStaked || new BigNumber(0)}
            totalSupply={undefined}
            totalStaked={undefined}
            totalUnclaimed={totalUnclaimed || new BigNumber(0)}
            totalClaimed={totalClaimed || new BigNumber(0)}
            currentStakingEra={undefined}
            currentBlock={undefined}
            nextEraBlock={undefined}
            blocksPerEra={undefined}
            unclaimedEras={undefined}
          />

          <DaoList mini={true} isOverview={true} totalStakedInSystem={totalStaked} />
        </div>
      ) : <div className="text-center">
        <h5 className="text-sm font-bold text-white">
          Wallet not connected
        </h5>
        <p className="mt-2 text-xs text-white">
          Connect your wallet to access your account overview.
        </p>
      </div>}
    </div>
  );
};

export default Overview;