import { web3Enable, web3FromAddress } from "@polkadot/extension-dapp";
import { InjectedAccountWithMeta } from "@polkadot/extension-inject/types";
import { encodeAddress } from "@polkadot/util-crypto";
import BigNumber from "bignumber.js";
import { useEffect, useRef, useState } from "react";
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
import ProjectCard from "../components/ProjectCard";
import MetricDashboard from "../components/MetricDashboard";
import Button from "../components/Button";
import { loadProjectCores, loadStakedDaos } from '../utils/stakingServices';
import { StakingCore, CoreEraStakedInfoType, UserStakedInfoType, ChainPropertiesType, TotalUserStakedData, StakedType, BalanceType, LockedType, CoreEraStakeType, LedgerType, TotalRewardsClaimedSubscription, TotalRewardsClaimedQuery, RewardQueryType, getCoreInfo, getTotalUserStaked } from "./staking";
import { calculateVestingData, fetchSystemData } from "../utils/vestingServices";
import OnOffSwitch from "../components/Switch";

export type StakedDaoType = StakingCore & { members?: AnyJson; };

const Overview = () => {
  const api = useApi();
  const descriptionRef = useRef<HTMLDivElement | null>(null);
  const setOpenModal = useModal((state) => state.setOpenModal);
  const selectedAccount = useAccount((state) => state.selectedAccount);
  const [hasUnbondedTokens, setHasUnbondedTokens] = useState(false);
  const [stakingCores, setStakingCores] = useState<StakingCore[]>([]);
  const [currentStakingEra, setCurrentStakingEra] = useState<number>(0);
  const [coreEraStakeInfo, setCoreEraStakeInfo] = useState<CoreEraStakedInfoType[]>([]);
  const [totalUserStaked, setTotalUserStaked] = useState<BigNumber>();
  const [totalStaked, setTotalStaked] = useState<BigNumber>();
  const [userStakedInfo, setUserStakedInfo] = useState<UserStakedInfoType[]
  >([]);
  const [totalSupply, setTotalSupply] = useState<BigNumber>();
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
  const [chainProperties, setChainProperties] = useState<ChainPropertiesType>();
  const [currentBlock, setCurrentBlock] = useState<number>(0);
  const [nextEraBlock, setNextEraBlock] = useState<number>(0);
  const [blocksPerEra, setBlocksPerEra] = useState<number>(0);
  const [coreInfoData, setCoreInfoData] = useState<{ [key: number]: CoreEraStakedInfoType | undefined; }>({});
  const [totalUserStakedData, setTotalUserStakedData] = useState<TotalUserStakedData>({});
  const [vestingSummary, setVestingSummary] = useState<VestingData | null>(null);
  const [enableAutoRestake, setEnableAutoRestake] = useState<boolean>(false);
  const [stakedDaos, setStakedDaos] = useState<StakedDaoType[]>([]);

  const [rewardsClaimedQuery] = useQuery({
    query: TotalRewardsClaimedQuery,
    variables: {
      accountId: selectedAccount
        ? encodeAddress(selectedAccount.address, 117)
        : null,
    },

    pause: !selectedAccount,
  });

  const setupSubscriptions = ({
    selectedAccount,
  }: {
    selectedAccount: InjectedAccountWithMeta;
  }) => {
    // Current block subscription
    const blocks = api.rpc.chain.subscribeNewHeads((header) => {
      setCurrentBlock(header.number.toNumber());
    });

    // Next era starting block subscription
    const nextEraStartingBlock = api.query.ocifStaking.nextEraStartingBlock(
      (blockNumber: Codec) => {
        setNextEraBlock(blockNumber.toPrimitive() as number);
      }
    );

    let generalEraInfo;

    if (currentStakingEra > 0) {
      generalEraInfo = api.query.ocifStaking.generalEraInfo(
        currentStakingEra,
        (c: Codec) => {
          const stakingInfo = c.toPrimitive() as StakedType;

          setTotalStaked(new BigNumber(stakingInfo.staked));
        }
      );
    }

    // Staking current era subscription
    const currentEra = api.query.ocifStaking.currentEra((era: Codec) => {
      setCurrentStakingEra(era.toPrimitive() as number);
    });

    const account = api.query.system.account(
      selectedAccount.address,
      async (account) => {
        const balance = account.toPrimitive() as BalanceType;
        const locked = (
          await api.query.ocifStaking.ledger(selectedAccount.address)
        ).toPrimitive() as LockedType;
        const availableTNKR = new BigNumber(balance.data.free).minus(new BigNumber(locked.locked));
        setAvailableBalance(availableTNKR);
      }
    );

    const unsubs = [blocks, nextEraStartingBlock, currentEra, account];

    if (generalEraInfo) {
      unsubs.push(generalEraInfo);
    }

    // Core era stake + Use era stake subscriptions
    const coreEraStakeInfoMap: Map<
      number, CoreEraStakedInfoType> = new Map();

    const userStakedInfoMap: Map<
      number, UserStakedInfoType
    > = new Map();

    for (const stakingCore of stakingCores) {
      api.query.ocifStaking.coreEraStake(
        stakingCore.key,
        currentStakingEra,
        (c: Codec) => {
          const coreEraStake = c.toPrimitive() as CoreEraStakeType;

          coreEraStakeInfoMap.set(stakingCore.key, {
            coreId: stakingCore.key,
            account: stakingCore.account,
            ...coreEraStake,
          });

          if (Array.from(coreEraStakeInfoMap.values()).length > 0) {
            setCoreEraStakeInfo(Array.from(coreEraStakeInfoMap.values()));
          }
        }
      );

      api.query.ocifStaking.ledger(selectedAccount.address, (c: Codec) => {
        const ledger = c.toPrimitive() as LedgerType;
        setHasUnbondedTokens(ledger.unbondingInfo.unlockingChunks.length > 0);
      });

      api.query.ocifStaking.generalStakerInfo(
        stakingCore.key,
        selectedAccount.address,
        (generalStakerInfo: Codec) => {
          const info = generalStakerInfo.toPrimitive() as StakesInfo;
          if (info.stakes.length > 0) {
            const unclaimedEarliest = info.stakes.reduce((p, v) => parseInt(p.era) < parseInt(v.era) ? p : v).era;
            if (parseInt(unclaimedEarliest) < currentStakingEra) {
              const unclaimed = unclaimedEras;
              const unclaimedCore = unclaimed.cores.find(value => value.coreId === stakingCore.key);

              if (unclaimedCore) {
                // Update the earliestEra of the existing core
                unclaimedCore.earliestEra = parseInt(unclaimedEarliest);
              } else {
                // Add a new core
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

            const latestInfo = info.stakes.at(-1);

            if (!latestInfo) {
              return;
            }

            userStakedInfoMap.set(stakingCore.key, {
              coreId: stakingCore.key,
              era: parseInt(latestInfo.era),
              staked: new BigNumber(latestInfo.staked),
            });

            if (Array.from(userStakedInfoMap.values()).length != 0) {
              setUserStakedInfo(Array.from(userStakedInfoMap.values()));

              const newTotalStaked = Array.from(
                userStakedInfoMap.values()
              ).reduce((acc, cur) => acc.plus(cur.staked), new BigNumber(0));

              setTotalUserStaked(newTotalStaked);
            }
          }
        }
      );
    }

    return unsubs as UnsubscribePromise[];
  };

  const loadStakingConstants = async () => {
    const blocksPerEra = api.consts.ocifStaking.blocksPerEra.toPrimitive() as number;
    const maxStakersPerCore = api.consts.ocifStaking.maxStakersPerCore.toPrimitive() as number;
    const inflationErasPerYear = api.consts.checkedInflation.erasPerYear.toPrimitive() as number;

    setBlocksPerEra(blocksPerEra);
    setChainProperties({ maxStakersPerCore, inflationErasPerYear });
  };

  const loadCurrentEraAndStake = async () => {
    const currentStakingEra = (await api.query.ocifStaking.currentEra()).toPrimitive() as number;
    const generalEraInfo = (await api.query.ocifStaking.generalEraInfo(currentStakingEra)).toPrimitive() as StakedType;
    const totalStaked = new BigNumber(generalEraInfo.staked);

    setCurrentStakingEra(currentStakingEra);
    setTotalStaked(totalStaked);
  };

  const loadTotalSupply = async () => {
    const supply = (await api.query.balances.totalIssuance()).toPrimitive() as string;
    setTotalSupply(new BigNumber(supply));
  };

  const loadAggregateStaked = async () => {
    const totalIssuance = (await api.query.balances.totalIssuance()).toPrimitive() as string;
    const inactiveIssuance = (await api.query.balances.inactiveIssuance()).toPrimitive() as string;
    setAggregateStaked(new BigNumber(totalIssuance).minus(new BigNumber(inactiveIssuance)));
  };

  const loadCores = async () => {
    const cores = await loadProjectCores(api);

    if (cores) {
      setStakingCores(cores);
    }
  };

  const loadCoreEraStakeInfo = async (stakingCores: StakingCore[]) => {
    const coreEraStakeInfo: CoreEraStakedInfoType[] = [];

    for (const stakingCore of stakingCores) {
      const coreEraStake = (await api.query.ocifStaking.coreEraStake(stakingCore.key, currentStakingEra)).toPrimitive() as CoreEraStakeType;

      coreEraStakeInfo.push({ coreId: stakingCore.key, account: stakingCore.account, ...coreEraStake });
    }

    setCoreEraStakeInfo(coreEraStakeInfo);
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

  const loadDaos = async () => {
    if (!selectedAccount) return;
    const daos = await loadStakedDaos(stakingCores, selectedAccount?.address, totalUserStakedData, api);
    setStakedDaos(daos);
  };

  const loadDashboardData = async (selectedAccount: InjectedAccountWithMeta | null) => {
    try {
      toast.loading("Loading staking cores...");

      if (selectedAccount) {
        await loadAccountInfo(selectedAccount);
        await loadCores();
        await loadStakingConstants();
        await loadCurrentEraAndStake();
        await loadTotalSupply();
        await loadAggregateStaked();
        await loadCoreEraStakeInfo(stakingCores);
        await loadVestingBalance(selectedAccount);
      }

      toast.dismiss();
    } catch (error) {
      toast.dismiss();
      setLoading(false);
      toast.error(`${ error }`);
    }
  };

  const handleManageStaking = async ({
    core,
    totalUserStaked,
    availableBalance,
  }: {
    core: StakingCore;
    totalUserStaked: BigNumber;
    availableBalance: BigNumber;
  }) => {
    setOpenModal({
      name: modalName.MANAGE_STAKING,
      metadata: { ...core, totalUserStaked, availableBalance, stakingCores, totalUserStakedData },
    });
  };

  const handleAutoRestake = (bool: boolean) => {
    // use toasts to show if auto-restake is enabled or disabled
    if (bool) {
      toast.success("Auto-restake enabled");
    } else {
      toast.error("Auto-restake disabled");
    }
    // save the value to local storage
    localStorage.setItem("autoRestake", JSON.stringify(bool));
  };

  const handleClaimAll = async () => {
    if (!selectedAccount) return;

    if (!unclaimedEras) return;

    if (!currentStakingEra) return;

    try {
      toast.loading("Claiming...");

      await web3Enable("Tinkernet");

      const injector = await web3FromAddress(selectedAccount.address);

      const batch = [];

      const uniqueCores = [
        ...new Map(unclaimedEras.cores.map((x) => [x.coreId, x])).values(),
      ];

      for (const core of uniqueCores) {
        if (!core?.earliestEra) continue;

        if (typeof currentStakingEra === 'number' && core && typeof core.earliestEra === 'number') {
          if (core.earliestEra <= currentStakingEra) {
            const iterations = currentStakingEra - core.earliestEra;
            for (let i = 0; i < iterations; i++) {
              batch.push(api.tx.ocifStaking.stakerClaimRewards(core.coreId));
              console.log("pushed core: ", core.coreId);
            }
          } else {
            console.error("core.earliestEra is greater than currentStakingEra");
          }
        } else {
          console.error("currentStakingEra, core, or core.earliestEra is undefined or not a number");
        }
      }

      console.log("batch: ", batch);
      console.log("uniqueCores: ", uniqueCores);
      console.log("unclaimedEras: ", unclaimedEras);

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

  const handleRegisterProject = async () => {
    setOpenModal({
      name: modalName.REGISTER_PROJECT,
    });
  };

  const toggleReadMore = (core: StakingCore) => {
    setOpenModal({
      name: modalName.READ_MORE,
      metadata: core.metadata,
    });
  };

  const toggleViewMembers = (core: StakingCore, members: AnyJson[]) => {
    setOpenModal({
      name: modalName.MEMBERS,
      metadata: { ...core.metadata, members },
    });
  };

  useSubscription(
    {
      query: TotalRewardsClaimedSubscription,
      variables: {
        accountId: selectedAccount
          ? encodeAddress(selectedAccount.address, 117)
          : null,
      },
      pause: !selectedAccount,
    },
    (
      _: unknown,
      result: { stakers: RewardQueryType[]; }
    ) => {
      if (result.stakers.length === 0) return;

      if (!result.stakers[0].totalRewards) return;

      const totalClaimed = new BigNumber(result.stakers[0].totalRewards);
      setTotalClaimed(totalClaimed);

      const totalUnclaimed = new BigNumber(result.stakers[0].totalUnclaimed);
      setTotalUnclaimed(totalUnclaimed);
    }
  );

  useEffect(() => {
    // load auto-restake value from local storage
    const autoRestake = localStorage.getItem("autoRestake");
    if (autoRestake) {
      setEnableAutoRestake(JSON.parse(autoRestake));
    }
  }, []);

  useEffect(() => {
    let unsubs: UnsubscribePromise[] = [];
    if (selectedAccount) {
      unsubs = setupSubscriptions({ selectedAccount });
    }

    return () => {
      unsubs.forEach(async (unsub) => (await unsub)());
    };
  }, [selectedAccount, api, stakingCores]);

  useEffect(() => {
    loadDashboardData(selectedAccount);
  }, [selectedAccount, api]);

  useEffect(() => {
    if (!selectedAccount) return;
    if (!stakingCores) return;
    loadDaos();
  }, [selectedAccount, stakingCores, totalUserStakedData, api]);

  useEffect(() => {
    let isMounted = true;

    (async () => {
      const coreInfoResults: { [key: number]: CoreEraStakedInfoType | undefined; } = {};
      const totalUserStakedResults: { [key: number]: BigNumber | undefined; } = {};

      for (const core of stakingCores) {
        if (!isMounted) {
          break;
        }

        const coreInfo = getCoreInfo(coreEraStakeInfo, core);
        const totalUserStaked = getTotalUserStaked(userStakedInfo, core);

        if (typeof coreInfo !== 'undefined') {
          coreInfoResults[core.key] = coreInfo;
        }

        if (typeof totalUserStaked !== 'undefined') {
          totalUserStakedResults[core.key] = totalUserStaked;
        }
      }

      if (isMounted) {
        setCoreInfoData(prevState => {
          const newState = { ...prevState, ...coreInfoResults };
          if (JSON.stringify(newState) !== JSON.stringify(prevState)) {
            return newState;
          }
          return prevState;
        });

        setTotalUserStakedData(prevState => {
          const newState = { ...prevState, ...totalUserStakedResults };
          if (JSON.stringify(newState) !== JSON.stringify(prevState)) {
            return newState;
          }
          return prevState;
        });

        setDataLoaded(true);
        setLoading(false);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [stakingCores, coreEraStakeInfo, userStakedInfo]);

  useEffect(() => {
    if (!rewardsClaimedQuery.data?.stakers?.length) return;

    const rewardsClaimed = new BigNumber(
      rewardsClaimedQuery.data.stakers[0].totalRewards
    );
    setTotalClaimed(rewardsClaimed);

    const totalUnclaimed = new BigNumber(
      rewardsClaimedQuery.data.stakers[0].totalUnclaimed
    );
    setTotalUnclaimed(totalUnclaimed);
  }, [selectedAccount, rewardsClaimedQuery]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full flex max-w-7xl flex-col justify-between p-4 sm:px-6 lg:px-8 mt-14 md:mt-0">
      <div className="flex flex-col md:flex-row md:justify-between items-start">
        <h2 className="lg:text-xl font-bold my-3">
          <span>Account Overview</span>
        </h2>
        {selectedAccount && <div className="flex flex-row w-full md:w-auto gap-2 items-center justify-start mb-4 z-1">
          <Button
            mini
            onClick={handleUnbondTokens}
            disabled={isWaiting}
            variant="secondary">
            Claim Unbonded TNKR
          </Button>
          <Button
            mini
            onClick={handleClaimAll}
            disabled={unclaimedEras.total === 0 || isWaiting}
            variant="primary">
            Claim TNKR Rewards
          </Button>
          <div className="flex flex-col gap-0 items-center justify-around relative border border-tinkerYellow border-opacity-50 bg-tinkerGrey rounded-lg scale-70 lg:scale-90">
            <div className="flex-grow">
              <OnOffSwitch defaultEnabled={enableAutoRestake} onChange={(bool) => handleAutoRestake(bool)} />
            </div>
            <span className="text-xxs text-gray-300 relative bottom-1">Auto-Restake</span>
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
            currentStakingEra={currentStakingEra || 0}
            currentBlock={currentBlock}
            nextEraBlock={nextEraBlock}
            blocksPerEra={blocksPerEra}
            unclaimedEras={unclaimedEras}
          />

          {/* <div>
            {selectedAccount ? (
              <button
                type="button"
                onClick={handleRegisterProject}
                className="inline-flex items-center justify-center rounded-md border border-amber-300 bg-amber-300 px-4 py-2 text-base font-medium text-black shadow-sm hover:bg-amber-200 focus:outline-none focus:ring-2 focus:ring-neutral-500 focus:ring-offset-2 disabled:opacity-40"
              >
                Register Project
              </button>
            ) : null}
          </div> */}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {isDataLoaded ? stakingCores.map((core: StakingCore) => {
              const coreInfo = coreInfoData[core.key];
              const userStaked = totalUserStakedData[core.key];

              return (
                <div className="relative" key={core.key}>
                  <ProjectCard
                    members={stakedDaos.find((dao) => dao.key === core.key)?.members as AnyJson[] || []}
                    core={core}
                    totalUserStaked={userStaked}
                    coreInfo={coreInfo}
                    handleManageStaking={handleManageStaking}
                    toggleExpanded={toggleReadMore}
                    toggleViewMembers={toggleViewMembers}
                    chainProperties={chainProperties}
                    availableBalance={availableBalance}
                    descriptionRef={descriptionRef}
                    selectedAccount={selectedAccount}
                  />
                </div>
              );
            }) : <LoadingSpinner />}
          </div>
        </>
      ) : <div className="text-center">
        <h5 className="text-2xl font-bold text-white">
          Wallet not connected
        </h5>
        <p className="mt-8 text-lg text-white">
          You can connect your wallet to access your staking information.
        </p>
      </div>}
    </div>
  );
};

export default Overview;
