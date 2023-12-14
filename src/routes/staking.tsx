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
import { Codec } from "@polkadot/types/types";
import getSignAndSendCallback from "../utils/getSignAndSendCallback";
import { UnsubscribePromise } from "@polkadot/api/types";
import { StakesInfo } from "./claim";
import ProjectCard from "../components/ProjectCard";
import MetricDashboard from "../components/MetricDashboard";
import Button from "../components/Button";
import { loadProjectCores } from '../utils/stakingServices';

export type RewardQueryType = { latestClaimBlock: number; totalRewards: string; totalUnclaimed: string; };

export const TotalRewardsClaimedQuery = `
  query totalRewardsClaimed($accountId: String!) {
    stakers(where: {account_eq: $accountId}) {
      latestClaimBlock
      totalRewards
      totalUnclaimed
    }
  }
`;

export const TotalRewardsClaimedSubscription = `
  subscription totalRewardsClaimed($accountId: String!) {
    stakers(where: {account_eq: $accountId}) {
      latestClaimBlock
      totalRewards
      totalUnclaimed
    }
  }
`;

export type StakingCore = {
  key: number;
  account: string;
  metadata: {
    name: string;
    description: string;
    image: string;
  };
};

export type TotalUserStakedData = { [key: number]: BigNumber | undefined; };

export type BalanceType = {
  nonce: string;
  consumers: string;
  providers: string;
  sufficients: string;
  data: {
    free: string;
    reserved: string;
    frozen: string;
  };
};

export type CoreEraStakedInfoType = {
  coreId: number;
  account: string;
  total: string;
  numberOfStakers: number;
  rewardClaimed: boolean;
  active: boolean;
};

export type CoreEraStakeType = {
  total: string;
  numberOfStakers: number;
  rewardClaimed: boolean;
  active: boolean;
};

export type UnclaimedErasType = {
  cores: { coreId: number; earliestEra: number; }[];
  total: number;
};

export type UserStakedInfoType = {
  coreId: number;
  era: number;
  staked: BigNumber;
};

export type ChainPropertiesType = {
  maxStakersPerCore: number;
  inflationErasPerYear: number;
};

export type LedgerType = {
  locked: number;
  unbondingInfo: {
    unlockingChunks: {
      amount: number;
      unlockEra: number;
    }[];
  };
};

export type LockedType = { locked: string; };

export type StakedType = { staked: string; };

export type CorePrimitiveType = {
  account: string;
  metadata: {
    name: string;
    description: string;
    image: string;
  };
};

const Staking = () => {
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
  const [totalClaimed, setTotalClaimed] = useState<BigNumber>(new BigNumber(0));
  const [chainProperties, setChainProperties] = useState<ChainPropertiesType>();
  const [currentBlock, setCurrentBlock] = useState<number>(0);
  const [nextEraBlock, setNextEraBlock] = useState<number>(0);
  const [blocksPerEra, setBlocksPerEra] = useState<number>(0);
  const [coreInfoData, setCoreInfoData] = useState<{ [key: number]: CoreEraStakedInfoType | undefined; }>({});
  const [totalUserStakedData, setTotalUserStakedData] = useState<TotalUserStakedData>({});

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
            const unclaimedEarliest = info.stakes.reduce((p, v) => p.era < v.era ? p : v).era;
            if (parseInt(unclaimedEarliest) < currentStakingEra) {
              const unclaimed = unclaimedEras;
              const cores = unclaimed.cores.filter((value) => {
                return value.coreId === stakingCore.key;
              });

              cores.push({
                coreId: stakingCore.key,
                earliestEra: parseInt(unclaimedEarliest),
              });

              let total = unclaimed.total;
              total = currentStakingEra - parseInt(unclaimedEarliest);

              setUnclaimedEras({
                cores,
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

  const loadDashboardData = async (selectedAccount: InjectedAccountWithMeta | null) => {
    try {
      toast.loading("Loading staking cores...");

      if (selectedAccount) {
        await loadAccountInfo(selectedAccount);
      }
      await loadCores();
      await loadStakingConstants();
      await loadCurrentEraAndStake();
      await loadTotalSupply();
      await loadAggregateStaked();
      await loadCoreEraStakeInfo(stakingCores);

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

        for (let i = 0; i < currentStakingEra - core.earliestEra; i += 1) {
          batch.push(api.tx.ocifStaking.stakerClaimRewards(core.coreId));
          console.log("pushed core: ", core.coreId);
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

  function getTotalUserStaked(userStakedInfo: UserStakedInfoType[], core: StakingCore) {
    return !!userStakedInfo && userStakedInfo.find(
      (info) => info.coreId === core.key
    )?.staked;
  }

  function getCoreInfo(coreEraStakeInfo: CoreEraStakedInfoType[], core: StakingCore) {
    return !!coreEraStakeInfo && coreEraStakeInfo.find(
      (info) => info.account === core.account
    );
  }

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
    }
  );

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
  }, [selectedAccount, rewardsClaimedQuery]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full flex max-w-7xl flex-col justify-between p-4 sm:px-6 lg:px-8 mt-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
        <h2 className="lg:text-xl font-bold my-3">
          <span>Staking</span>
        </h2>
      </div>
      {selectedAccount ? (
        <>
          <MetricDashboard
            vestingBalance={undefined}
            availableBalance={undefined}
            aggregateStaked={aggregateStaked || new BigNumber(0)}
            totalUserStaked={totalUserStaked || new BigNumber(0)}
            totalSupply={totalSupply || new BigNumber(0)}
            totalStaked={totalStaked || new BigNumber(0)}
            totalUnclaimed={undefined}
            totalClaimed={undefined}
            currentStakingEra={undefined}
            currentBlock={undefined}
            nextEraBlock={undefined}
            blocksPerEra={undefined}
            unclaimedEras={undefined}
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
                    core={core}
                    totalUserStaked={userStaked}
                    coreInfo={coreInfo}
                    handleManageStaking={handleManageStaking}
                    toggleExpanded={toggleReadMore}
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

export default Staking;
