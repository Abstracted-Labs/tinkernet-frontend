import { web3Enable, web3FromAddress } from "@polkadot/extension-dapp";
import { InjectedAccountWithMeta } from "@polkadot/extension-inject/types";
import { encodeAddress } from "@polkadot/util-crypto";
import BigNumber from "bignumber.js";
import { useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import LoadingSpinner from "../components/LoadingSpinner";
import useApi from "../hooks/useApi";
import useAccount from "../stores/account";
import useModal, { modalName } from "../stores/modals";
import { useQuery, useSubscription } from "urql";
import { AnyJson, Codec } from "@polkadot/types/types";
import getSignAndSendCallback from "../utils/getSignAndSendCallback";
import { UnsubscribePromise } from "@polkadot/api/types";
import { StakesInfo, VestingData, VestingSchedule } from "./claim";
import MetricDashboard from "../components/MetricDashboard";
import Button from "../components/Button";
import { loadProjectCores, loadStakedDaos } from '../utils/stakingServices';
import { StakingCore, CoreEraStakeInfoType, UserStakedInfoType, TotalUserStakedData, BalanceType, LockedType, TotalRewardsClaimedSubscription, TotalRewardsClaimedQuery, RewardQueryType, TotalRewardsCoreClaimedQuery, getCoreInfo, getTotalUserStaked } from "./staking";
import { calculateVestingData, fetchSystemData } from "../utils/vestingServices";
import DaoList from "../components/DaoList";

export type StakedDaoType = StakingCore & { members?: AnyJson; };

const Overview = () => {
  const api = useApi();
  const setOpenModal = useModal((state) => state.setOpenModal);
  const selectedAccount = useAccount((state) => state.selectedAccount);
  const [stakingCores, setStakingCores] = useState<StakingCore[]>([]);
  const [currentStakingEra, setCurrentStakingEra] = useState<number>(0);
  const [coreEraStakeInfo, setCoreEraStakeInfo] = useState<CoreEraStakeInfoType[]>([]);
  const [totalUserStaked, setTotalUserStaked] = useState<BigNumber>();
  const [aggregateStaked, setAggregateStaked] = useState<BigNumber>();
  const [unclaimedEras, setUnclaimedEras] = useState<{
    cores: { coreId: number; earliestEra: number; }[];
    total: number;
  }>({ cores: [], total: 0 });
  const [availableBalance, setAvailableBalance] = useState<BigNumber>();
  const [isLoading, setLoading] = useState(true);
  const [isWaiting, setWaiting] = useState(false);
  const [isDataLoaded, setDataLoaded] = useState(false);
  const [totalUnclaimed, setTotalUnclaimed] = useState<BigNumber>(new BigNumber(0));
  const [totalClaimed, setTotalClaimed] = useState<BigNumber>(new BigNumber(0));
  const [nextEraBlock, setNextEraBlock] = useState<number>(0);
  const [blocksPerEra, setBlocksPerEra] = useState<number>(0);
  const [totalUserStakedData, setTotalUserStakedData] = useState<TotalUserStakedData>({});
  const [userStakedInfo, setUserStakedInfo] = useState<UserStakedInfoType[]
  >([]);
  const [vestingSummary, setVestingSummary] = useState<VestingData | null>(null);
  const [enableAutoRestake, setEnableAutoRestake] = useState<boolean>(false);
  const [stakedDaos, setStakedDaos] = useState<StakedDaoType[]>([]);

  const [rewardsUserClaimedQuery, reexecuteQuery] = useQuery({
    query: TotalRewardsClaimedQuery,
    variables: {
      accountId: selectedAccount
        ? encodeAddress(selectedAccount.address, 117)
        : null,
    },
    pause: !selectedAccount,
  });

  const [rewardsCoreClaimedQuery] = useQuery({
    query: TotalRewardsCoreClaimedQuery,
    variables: {}
  });

  const setupSubscriptions = ({
    selectedAccount,
  }: {
    selectedAccount: InjectedAccountWithMeta;
  }) => {
    // Current block subscription
    const blocks = api.rpc.chain.subscribeNewHeads(() => { });

    // Next era starting block subscription
    const nextEraStartingBlock = api.query.ocifStaking.nextEraStartingBlock(
      (blockNumber: Codec) => {
        setNextEraBlock(blockNumber.toPrimitive() as number);
      }
    );

    let generalEraInfo;

    if (currentStakingEra > 0) {
      generalEraInfo = api.query.ocifStaking.generalEraInfo(currentStakingEra);
    }

    // Staking current era subscription
    const currentEra = api.query.ocifStaking.currentEra((era: Codec) => {
      setCurrentStakingEra(era.toPrimitive() as number);
    });

    const account = api.query.system.account(selectedAccount.address);

    const unsubs = [blocks, nextEraStartingBlock, currentEra, account];

    if (generalEraInfo) {
      unsubs.push(generalEraInfo);
    }

    const userStakedInfoMap: Map<
      number, UserStakedInfoType
    > = new Map();

    if (coreEraStakeInfo && coreEraStakeInfo.length > 0) {
      for (const stakingCore of stakingCores) {
        api.query.ocifStaking.generalStakerInfo(
          stakingCore.key,
          selectedAccount.address,
          (generalStakerInfo: Codec) => {
            const info = generalStakerInfo.toPrimitive() as StakesInfo;
            const latestInfo = info.stakes.at(-1);

            let era = -1;
            let staked = new BigNumber(0);

            if (latestInfo) {
              era = parseInt(latestInfo.era);
              staked = new BigNumber(latestInfo.staked);
            }

            userStakedInfoMap.set(stakingCore.key, {
              coreId: stakingCore.key,
              era: era,
              staked: staked,
            });

            setUserStakedInfo(Array.from(userStakedInfoMap.values()));

            if (info.stakes.length > 0) {
              const unclaimedEarliest = info.stakes.reduce((p, v) => parseInt(p.era) < parseInt(v.era) ? p : v).era;

              if (parseInt(unclaimedEarliest) < currentStakingEra) {
                const unclaimed = unclaimedEras;
                const unclaimedCore = unclaimed.cores.find(value => value.coreId === stakingCore.key);

                if (unclaimedCore) {
                  unclaimedCore.earliestEra = parseInt(unclaimedEarliest);
                } else {
                  unclaimed.cores.push({
                    coreId: stakingCore.key,
                    earliestEra: parseInt(unclaimedEarliest),
                  });
                }

                let total = unclaimed.total;
                total = currentStakingEra - parseInt(unclaimedEarliest);

                setUnclaimedEras({
                  cores: unclaimed.cores,
                  total,
                });
              } else {
                setUnclaimedEras((unclaimedEras) => ({
                  ...unclaimedEras,
                  total: 0,
                }));
              }
            }

            const newTotalStaked = Array.from(
              userStakedInfoMap.values()
            ).reduce((acc, cur) => acc.plus(cur.staked), new BigNumber(0));

            setTotalUserStaked(newTotalStaked);
          }
        );
      }
    }

    return Promise.resolve(unsubs as UnsubscribePromise[]);
  };

  const loadStakingConstants = async () => {
    const blocksPerEra = api.consts.ocifStaking.blocksPerEra.toPrimitive() as number;
    setBlocksPerEra(blocksPerEra);
  };

  const loadAggregateStaked = async () => {
    const totalIssuance = (await api.query.balances.totalIssuance()).toPrimitive() as string;
    const inactiveIssuance = (await api.query.balances.inactiveIssuance()).toPrimitive() as string;
    setAggregateStaked(new BigNumber(totalIssuance).minus(new BigNumber(inactiveIssuance)));
  };

  const loadTotalUserStaked = async () => {
    if (!selectedAccount) return;

    const coreInfoResults: { [key: number]: Partial<CoreEraStakeInfoType> | undefined; } = {};
    const totalUserStakedResults: TotalUserStakedData = {};

    for (const core of stakingCores) {
      const coreInfo = getCoreInfo(coreEraStakeInfo, core);
      const totalUserStaked = getTotalUserStaked(userStakedInfo, core);

      coreInfoResults[core.key] = coreInfo;
      totalUserStakedResults[core.key] = totalUserStaked;
    }

    setTotalUserStakedData(totalUserStakedResults);
  };

  const loadDaos = async () => {
    if (!selectedAccount) return;
    const daos = await loadStakedDaos(stakingCores, selectedAccount?.address, api);
    setStakedDaos(daos);
  };

  const loadCores = async () => {
    const cores = await loadProjectCores(api);

    if (cores) {
      setStakingCores(cores);
    }
  };

  const loadAccountInfo = async (selectedAccount: InjectedAccountWithMeta) => {
    const account = await api.query.system.account(selectedAccount.address);
    const balance = account.toPrimitive() as BalanceType;
    const locked = (await api.query.ocifStaking.ledger(selectedAccount.address)).toPrimitive() as LockedType;
    const currentBalance = new BigNumber(balance.data.free).minus(new BigNumber(locked.locked));

    setAvailableBalance(currentBalance);
  };

  const loadVestingBalance = async (selectedAccount: InjectedAccountWithMeta | null) => {
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
  };

  const loadDashboardData = async (selectedAccount: InjectedAccountWithMeta | null) => {
    try {
      toast.loading("Loading staking cores...");

      if (selectedAccount) {
        await Promise.all([
          loadAccountInfo(selectedAccount),
          loadCores(),
          loadStakingConstants(),
          loadAggregateStaked(),
          loadVestingBalance(selectedAccount)
        ]);
      }
    } catch (error) {
      toast.dismiss();
      toast.error(`${ error }`);
    } finally {
      toast.dismiss();
      toast.success("Loaded");
      setLoading(false);
      setDataLoaded(true);
    }
  };

  const handleRestakingLogic = () => {
    // grab the total unclaimed rewards and account for the existential deposit
    const unclaimedMinusED = new BigNumber(totalUnclaimed);

    // Check if unclaimedMinusED is a valid number
    if (isNaN(unclaimedMinusED.toNumber())) {
      console.error("Invalid unclaimedMinusED");
      return;
    }

    if (unclaimedMinusED.toNumber() <= 0) {
      console.error("unclaimedMinusED must be greater than 0");
      return;
    }

    // Check if stakedDaos.length is a valid number and not zero to avoid division by zero
    if (isNaN(stakedDaos.length) || stakedDaos.length === 0) {
      console.error("Invalid stakedDaos.length");
      return;
    }

    // divide unclaimedMinusED by the number of stakedDaos the user is part of
    const unclaimedPerCore = unclaimedMinusED.div(stakedDaos.length);

    return unclaimedPerCore;
  };

  const handleClaimAll = async () => {
    if (!selectedAccount || !unclaimedEras || !currentStakingEra) return;

    try {
      toast.loading("Claiming...");

      if (disableClaiming) {
        toast.dismiss();
        toast.error("Can only claim when unclaimed TNKR is greater than the existential deposit");
        return;
      }

      await web3Enable("Tinkernet");

      const injector = await web3FromAddress(selectedAccount.address);

      const batch = [];

      const uniqueCores = [
        ...new Map(unclaimedEras.cores.map((x) => [x.coreId, x])).values(),
      ];

      for (const core of uniqueCores) {
        if (!core?.earliestEra) continue;

        const localEarliestEra = core.earliestEra; // Create a local copy of core.earliestEra

        if (typeof currentStakingEra === 'number' && core && typeof localEarliestEra === 'number') {
          for (let i = 0; i < currentStakingEra - localEarliestEra; i++) {
            batch.push(api.tx.ocifStaking.stakerClaimRewards(core.coreId));
          }
        } else {
          console.error("currentStakingEra, core, or localEarliestEra is undefined or not a number");
        }

        console.log("utility.batch", batch);
      }

      if (enableAutoRestake) {
        for (const core of uniqueCores) {
          if (!core?.earliestEra) continue;

          // using the restaking logic, calculate the amount to restake
          const restakeAmount = handleRestakingLogic();
          // Check if restakeAmount is not zero
          if (restakeAmount && !restakeAmount.isZero()) {
            // Convert restakeAmount to an integer string
            const restakeAmountInteger = restakeAmount.integerValue().toString();
            // push restake tx to the batch
            batch.push(api.tx.ocifStaking.stake(core.coreId, restakeAmountInteger));
          }
        }
      }

      await api.tx.utility.batch(batch).signAndSend(
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

  const handleUnbondTokens = () => {
    setOpenModal({
      name: modalName.UNBOND_TOKENS,
    });
  };

  const disableClaiming = useMemo(() => {
    return unclaimedEras.total === 0 || isWaiting;
  }, [unclaimedEras, isWaiting]);

  useEffect(() => {
    // load auto-restake value from local storage
    const autoRestake = localStorage.getItem("autoRestake");
    if (autoRestake) {
      setEnableAutoRestake(JSON.parse(autoRestake));
    }
  }, []);

  useEffect(() => {
    loadDashboardData(selectedAccount);
  }, [selectedAccount, api]);

  useEffect(() => {
    if (!selectedAccount) return;
    if (!stakingCores) return;
    loadDaos();
  }, [selectedAccount, stakingCores, api]);

  useEffect(() => {
    if (selectedAccount) {
      reexecuteQuery();
    }
  }, [selectedAccount?.address]);

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
    console.log("rewardsClaimed", rewardsClaimed.toString());
    setTotalClaimed(rewardsClaimed);

    const totalUnclaimed = new BigNumber(
      rewardsUserClaimedQuery.data.stakers[0].totalUnclaimed
    );
    console.log("totalUnclaimed", totalUnclaimed.toString());
    setTotalUnclaimed(totalUnclaimed);
  }, [selectedAccount?.address, rewardsUserClaimedQuery]);

  useEffect(() => {
    loadTotalUserStaked();
  }, [selectedAccount, stakingCores]);

  useEffect(() => {
    if (!rewardsCoreClaimedQuery.data?.cores?.length || !selectedAccount) return;

    const coreEraStakeInfoMap: CoreEraStakeInfoType[] = rewardsCoreClaimedQuery.data.cores;

    const uniqueCoreEraStakeInfo = coreEraStakeInfoMap.filter((core, index, self) =>
      index === self.findIndex((item) => item.coreId === core.coreId)
    );

    setCoreEraStakeInfo(uniqueCoreEraStakeInfo);
  }, [selectedAccount, stakingCores, rewardsCoreClaimedQuery.data]);

  useEffect(() => {
    let unsubs: UnsubscribePromise[] = [];
    const setup = async () => {
      if (selectedAccount) {
        unsubs = await setupSubscriptions({ selectedAccount });
      }
    };
    setup();

    return () => {
      unsubs.forEach((unsub: UnsubscribePromise) => {
        if (unsub) {
          unsub.then(unsubFunc => {
            if (typeof unsubFunc === 'function') {
              unsubFunc();
            }
          });
        }
      });
    };
  }, [selectedAccount, api, stakingCores, coreEraStakeInfo, currentStakingEra]);

  // useSubscription(
  //   {
  //     query: TotalRewardsClaimedSubscription,
  //     variables: {
  //       accountId: selectedAccount
  //         ? encodeAddress(selectedAccount.address, 117)
  //         : null,
  //     },
  //     pause: !selectedAccount,
  //   },
  //   (
  //     _: unknown,
  //     result: { stakers: RewardQueryType[]; }
  //   ) => {
  //     if (!result.stakers.length) {
  //       setTotalClaimed(new BigNumber(0));
  //       setTotalUnclaimed(new BigNumber(0));
  //       return;
  //     }

  //     const totalClaimed = new BigNumber(result.stakers[0].totalRewards ? result.stakers[0].totalRewards : 0);
  //     setTotalClaimed(totalClaimed);

  //     const totalUnclaimed = new BigNumber(result.stakers[0].totalUnclaimed ? result.stakers[0].totalUnclaimed : 0);
  //     setTotalUnclaimed(totalUnclaimed);
  //   }
  // );

  return (
    <div className="overflow-y-scroll mx-auto w-full flex max-w-7xl flex-col justify-between p-4 sm:px-6 lg:px-8 mt-14 md:mt-0 gap-3">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
        <h2 className="lg:text-xl font-bold leading-none my-3 flex flex-row items-center gap-4">
          <span>Account Overview</span>
          <span>{isLoading || !isDataLoaded ? <LoadingSpinner /> : null}</span>
        </h2>

        {selectedAccount && <div className="flex flex-col md:flex-row w-full md:w-auto gap-2 items-stretch md:items-center justify-start z-1">
          <div>
            <Button
              mini
              onClick={handleUnbondTokens}
              disabled={isWaiting}
              variant="secondary">
              Claim Unbonded TNKR
            </Button>
          </div>
          <div className="flex flex-row items-center gap-1">
            <Button
              mini
              onClick={handleClaimAll}
              disabled={disableClaiming}
              variant="primary">
              Claim TNKR Rewards
            </Button>
          </div>
        </div>}
      </div>
      {selectedAccount &&
        currentStakingEra &&
        unclaimedEras ? (
        <>
          <MetricDashboard
            vestingBalance={vestingSummary?.vestedRemaining}
            availableBalance={availableBalance || new BigNumber(0)}
            aggregateStaked={aggregateStaked || new BigNumber(0)}
            totalUserStaked={totalUserStaked || new BigNumber(0)}
            totalSupply={undefined}
            totalStaked={undefined}
            totalUnclaimed={totalUnclaimed || new BigNumber(0)}
            totalClaimed={totalClaimed || new BigNumber(0)}
            currentStakingEra={undefined}
            currentBlock={undefined}
            nextEraBlock={nextEraBlock}
            blocksPerEra={blocksPerEra}
            unclaimedEras={undefined}
          />

          <DaoList mini={true} isOverview={true} />
        </>
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
