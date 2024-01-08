import { InjectedAccountWithMeta } from "@polkadot/extension-inject/types";
import BigNumber from "bignumber.js";
import { useEffect, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import LoadingSpinner from "../components/LoadingSpinner";
import useApi from "../hooks/useApi";
import useAccount from "../stores/account";
import { Codec } from "@polkadot/types/types";
import { UnsubscribePromise } from "@polkadot/api/types";
import { StakesInfo } from "./claim";
import MetricDashboard from "../components/MetricDashboard";
import { loadProjectCores, loadStakedDaos } from '../utils/stakingServices';
import DaoList from "../components/DaoList";
import Button from "../components/Button";
import useModal, { modalName } from "../stores/modals";
import { encodeAddress } from "@polkadot/util-crypto";
import { useQuery } from "urql";
import { StakedDaoType } from "./overview";
import OnOffSwitch from "../components/Switch";
import { autoRestake } from "../utils/autoRestake";
import { restakeClaim } from "../utils/restakeClaim";

export type UnsubFunction = () => Promise<void>;

export type RewardQueryType = { latestClaimBlock: number; totalRewards: string; totalUnclaimed: string; };

export const TotalRewardsClaimedQuery = `
  query totalRewardsClaimed($accountId: String) {
    stakers(where: {account_eq: $accountId}) {
      latestClaimBlock
      totalRewards
      totalUnclaimed
    }
  }
`;

export const TotalRewardsClaimedSubscription = `
  subscription totalRewardsClaimed($accountId: String) {
    stakers(where: {account_eq: $accountId}) {
      latestClaimBlock
      totalRewards
      totalUnclaimed
    }
  }
`;

export const TotalRewardsCoreClaimedQuery = `
  query totalRewardsCoreClaimed($coreId: Int) {
    cores(where: {coreId_eq: $coreId}) {
      latestClaimBlock
      totalRewards
      totalUnclaimed
      totalStaked
      coreId
      numberOfStakers
    }
  }
`;

export const TotalRewardsCoreClaimedSubscription = `
  subscription totalRewardsCoreClaimed($coreId: Int) {
    cores(where: {coreId_eq: $coreId}) {
      latestClaimBlock
      totalRewards
      totalUnclaimed
      totalStaked
      coreId
      numberOfStakers
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

export type CoreEraStakeInfoType = {
  coreId: number;
  account: string;
  totalRewards: string;
  totalUnclaimed: string;
  totalStaked: string;
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

export function getTotalUserStaked(userStakedInfo: UserStakedInfoType[], core: StakingCore) {
  return !!userStakedInfo && userStakedInfo.find(
    (info) => info.coreId === core.key
  )?.staked;
}

export function getCoreInfo(coreEraStakeInfo: (CoreEraStakeInfoType)[], core: StakingCore) {
  return !!coreEraStakeInfo && coreEraStakeInfo.find(
    (info) => info.coreId === core.key
  );
}

const Staking = () => {
  const api = useApi();
  const setOpenModal = useModal((state) => state.setOpenModal);
  const selectedAccount = useAccount((state) => state.selectedAccount);
  const [isLoading, setLoading] = useState(true);
  const [isWaiting, setWaiting] = useState(false);
  const [isDataLoaded, setDataLoaded] = useState(false);
  const [enableAutoRestake, setEnableAutoRestake] = useState<boolean>(true);
  const [claimAllSuccess, setClaimAllSuccess] = useState(false);
  const [stakingCores, setStakingCores] = useState<StakingCore[]>([]);
  const [currentStakingEra, setCurrentStakingEra] = useState<number>(0);
  const [totalUserStaked, setTotalUserStaked] = useState<BigNumber>();
  const [totalStaked, setTotalStaked] = useState<BigNumber>();
  const [totalSupply, setTotalSupply] = useState<BigNumber>();
  const [aggregateStaked, setAggregateStaked] = useState<BigNumber>();
  const [totalUnclaimed, setTotalUnclaimed] = useState<BigNumber>(new BigNumber(0));
  const [totalClaimed, setTotalClaimed] = useState<BigNumber>(new BigNumber(0));
  const [coreEraStakeInfo, setCoreEraStakeInfo] = useState<CoreEraStakeInfoType[]>([]);
  const [totalUserStakedData, setTotalUserStakedData] = useState<TotalUserStakedData>({});
  const [userStakedInfo, setUserStakedInfo] = useState<UserStakedInfoType[]
  >([]);
  const [stakedDaos, setStakedDaos] = useState<StakedDaoType[]>([]);
  const [unclaimedEras, setUnclaimedEras] = useState<{
    cores: { coreId: number; earliestEra: number; }[];
    total: number;
  }>({ cores: [], total: 0 });
  const [currentBlock, setCurrentBlock] = useState<number>(0);
  const [nextEraBlock, setNextEraBlock] = useState<number>(0);
  const [blocksPerEra, setBlocksPerEra] = useState<number>(0);

  const [rewardsUserClaimedQuery, reexecuteQuery] = useQuery({
    query: TotalRewardsClaimedQuery,
    variables: {
      accountId: selectedAccount
        ? encodeAddress(selectedAccount.address, 117)
        : null,
    },

    pause: !selectedAccount,
  });

  const [rewardsCoreClaimedQuery, reexecuteCoreQuery] = useQuery({
    query: TotalRewardsCoreClaimedQuery,
    variables: {},

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
            }

            if (latestInfo) {
              era = parseInt(latestInfo.era);
              staked = new BigNumber(latestInfo.staked);
            }

            userStakedInfoMap.set(stakingCore.key, {
              coreId: stakingCore.key,
              era: era,
              staked: staked,
            });

            const newTotalStaked = Array.from(
              userStakedInfoMap.values()
            ).reduce((acc, cur) => acc.plus(cur.staked), new BigNumber(0));

            setTotalUserStaked(newTotalStaked);
            setUserStakedInfo(Array.from(userStakedInfoMap.values()));
          }
        );
      }
    }

    return Promise.resolve(unsubs as UnsubscribePromise[]);
  };

  const loadTotalUserStaked = () => {
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

  const loadStakingConstants = async () => {
    const blocksPerEra = api.consts.ocifStaking.blocksPerEra.toPrimitive() as number;
    setBlocksPerEra(blocksPerEra);
  };

  const loadAggregateStaked = async () => {
    const totalIssuance = (await api.query.balances.totalIssuance()).toPrimitive() as string;
    const inactiveIssuance = (await api.query.balances.inactiveIssuance()).toPrimitive() as string;
    setAggregateStaked(new BigNumber(totalIssuance).minus(new BigNumber(inactiveIssuance)));
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

  const initializeData = async (selectedAccount: InjectedAccountWithMeta | null) => {
    try {
      toast.loading("Loading staking cores...");

      if (selectedAccount) {
        await Promise.all([
          loadCores(),
          loadStakingConstants(),
          loadCurrentEraAndStake(),
          loadTotalSupply(),
          loadAggregateStaked()
        ]);
      }
    } catch (error) {
      toast.dismiss();
      toast.error(`${ error }`);
    } finally {
      toast.dismiss();
      toast.success('Loaded');
      setLoading(false);
      setDataLoaded(true);
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

  const handleAutoRestakeSwitch = (bool: boolean) => {
    setEnableAutoRestake(bool);
    autoRestake(bool);
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

    const result = await restakeClaim({
      api,
      selectedAccount,
      unclaimedEras,
      currentStakingEra,
      enableAutoRestake,
      setWaiting,
      disableClaiming,
      handleRestakingLogic,
    });
    setClaimAllSuccess(result);
    refreshQuery();
  };

  const refreshQuery = () => {
    if (!claimAllSuccess) return;
    reexecuteQuery({ requestPolicy: 'network-only' });
    reexecuteCoreQuery({ requestPolicy: 'network-only' });
    setClaimAllSuccess(false);
  };

  const disableClaiming = useMemo(() => {
    return unclaimedEras.total === 0 || isWaiting;
  }, [unclaimedEras, isWaiting]);

  useEffect(() => {
    // Load auto-restake value from local storage
    const autoRestake = localStorage.getItem("autoRestake");
    if (autoRestake) {
      const parsedAutoRestake = JSON.parse(autoRestake);
      if (typeof parsedAutoRestake === 'boolean') {
        setEnableAutoRestake(parsedAutoRestake);
      } else {
        console.error("Invalid value in local storage for 'autoRestake'. Expected a boolean.");
      }
    } else {
      // Set a default value when there's no value in local storage
      setEnableAutoRestake(true);
    }
  }, []);

  useEffect(() => {
    initializeData(selectedAccount);
  }, [selectedAccount?.address, api]);

  useEffect(() => {
    if (!selectedAccount) return;
    if (!stakingCores) return;
    loadDaos();
  }, [selectedAccount?.address, stakingCores, totalUserStakedData, api]);

  useEffect(() => {
    if (rewardsUserClaimedQuery.fetching || !selectedAccount?.address) return;

    if (!rewardsUserClaimedQuery.data?.stakers?.length) {
      setTotalClaimed(new BigNumber(0));
      setTotalUnclaimed(new BigNumber(0));
      setUnclaimedEras({ cores: [], total: 0 });
      return;
    }

    const rewardsClaimed = new BigNumber(
      rewardsUserClaimedQuery.data.stakers[0].totalRewards
    );
    setTotalClaimed(rewardsClaimed);

    const totalUnclaimed = new BigNumber(
      rewardsUserClaimedQuery.data.stakers[0].totalUnclaimed
    );
    setTotalUnclaimed(claimAllSuccess ? new BigNumber(0) : totalUnclaimed);
  }, [selectedAccount?.address, rewardsUserClaimedQuery, claimAllSuccess]);

  useEffect(() => {
    loadTotalUserStaked();
  }, [selectedAccount?.address, stakingCores, coreEraStakeInfo, userStakedInfo]);

  useEffect(() => {
    if (rewardsCoreClaimedQuery.fetching || !rewardsCoreClaimedQuery.data?.cores?.length || !selectedAccount) return;

    const coreEraStakeInfoMap: CoreEraStakeInfoType[] = rewardsCoreClaimedQuery.data.cores;

    const uniqueCoreEraStakeInfo = coreEraStakeInfoMap.filter((core, index, self) =>
      index === self.findIndex((item) => item.coreId === core.coreId)
    );

    setCoreEraStakeInfo(uniqueCoreEraStakeInfo);
  }, [selectedAccount?.address, stakingCores, rewardsCoreClaimedQuery]);

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
  }, [selectedAccount?.address, api, stakingCores, coreEraStakeInfo]);

  return (
    <div className="mx-auto w-full flex max-w-7xl flex-col justify-between p-4 sm:px-6 lg:px-8 mt-14 md:mt-0 gap-3">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
        <h2 className="lg:text-xl font-bold leading-none my-3 flex flex-row items-center gap-4">
          <span>DAO Staking</span>
          <span>{isLoading || !isDataLoaded ? <LoadingSpinner /> : null}</span>
        </h2>

        {selectedAccount && <div className="flex flex-col md:flex-row w-full md:w-auto gap-2 items-stretch md:items-center justify-start z-1">
          <div className="">
            <Button
              mini
              onClick={handleRegisterProject}
              disabled={isLoading}
              variant="primary">
              Register New DAO
            </Button>
          </div>
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
            <div className="flex flex-col items-center justify-around relative border border-tinkerYellow border-opacity-50 bg-tinkerGrey rounded-lg scale-70 lg:scale-90">
              <div className="flex-grow">
                <OnOffSwitch defaultEnabled={enableAutoRestake} onChange={(bool) => handleAutoRestakeSwitch(bool)} />
              </div>
              <span className="text-[.5rem] text-gray-300 relative bottom-1">Auto-Restake</span>
            </div>
          </div>
        </div>}
      </div>

      {selectedAccount ? (
        <div>
          <MetricDashboard
            vestingBalance={undefined}
            availableBalance={undefined}
            lockedBalance={undefined}
            aggregateStaked={aggregateStaked || new BigNumber(0)}
            totalUserStaked={totalUserStaked || new BigNumber(0)}
            totalSupply={totalSupply || new BigNumber(0)}
            totalStaked={totalStaked || new BigNumber(0)}
            totalUnclaimed={totalUnclaimed || new BigNumber(0)}
            totalClaimed={totalClaimed || new BigNumber(0)}
            currentStakingEra={currentStakingEra || 0}
            currentBlock={currentBlock}
            nextEraBlock={nextEraBlock}
            blocksPerEra={blocksPerEra}
            unclaimedEras={unclaimedEras}
          />

          <DaoList mini={false} isOverview={false} />
        </div>
      ) : <div className="text-center">
        <h5 className="text-sm font-bold text-white">
          Wallet not connected
        </h5>
        <p className="mt-2 text-xs text-white">
          Connect your wallet to view your staking information.
        </p>
      </div>}
    </div>
  );
};

export default Staking;
