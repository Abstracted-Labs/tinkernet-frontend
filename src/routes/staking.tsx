import { InjectedAccountWithMeta } from "@polkadot/extension-inject/types";
import BigNumber from "bignumber.js";
import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import LoadingSpinner from "../components/LoadingSpinner";
import useApi from "../hooks/useApi";
import useAccount from "../stores/account";
import { Codec } from "@polkadot/types/types";
import { UnsubscribePromise } from "@polkadot/api/types";
import { StakesInfo } from "./claim";
import MetricDashboard from "../components/MetricDashboard";
import { loadProjectCores } from '../utils/stakingServices';
import DaoList from "../components/DaoList";
import Button from "../components/Button";
import useModal, { modalName } from "../stores/modals";

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

export function getCoreInfo(coreEraStakeInfo: (CoreEraStakeInfoType | Partial<CoreEraStakeInfoType>)[], core: StakingCore) {
  return !!coreEraStakeInfo && coreEraStakeInfo.find(
    (info) => info.coreId === core.key
  );
}

const Staking = () => {
  const api = useApi();
  const setOpenModal = useModal((state) => state.setOpenModal);
  const selectedAccount = useAccount((state) => state.selectedAccount);
  const [stakingCores, setStakingCores] = useState<StakingCore[]>([]);
  const [currentStakingEra, setCurrentStakingEra] = useState<number>(0);
  const [totalUserStaked, setTotalUserStaked] = useState<BigNumber>();
  const [totalStaked, setTotalStaked] = useState<BigNumber>();
  const [totalSupply, setTotalSupply] = useState<BigNumber>();
  const [aggregateStaked, setAggregateStaked] = useState<BigNumber>();
  const [isLoading, setLoading] = useState(true);
  const [isDataLoaded, setDataLoaded] = useState(false);

  const setupSubscriptions = ({
    selectedAccount,
  }: {
    selectedAccount: InjectedAccountWithMeta;
  }) => {
    // Current block subscription
    const blocks = api.rpc.chain.subscribeNewHeads(() => { });

    // Next era starting block subscription
    const nextEraStartingBlock = api.query.ocifStaking.nextEraStartingBlock(() => { });

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

    for (const stakingCore of stakingCores) {
      api.query.ocifStaking.generalStakerInfo(
        stakingCore.key,
        selectedAccount.address,
        (generalStakerInfo: Codec) => {
          const info = generalStakerInfo.toPrimitive() as StakesInfo;
          if (info.stakes.length > 0) {
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

  const loadDashboardData = async (selectedAccount: InjectedAccountWithMeta | null) => {
    try {
      toast.loading("Loading staking cores...");

      if (selectedAccount) {
        await Promise.all([
          loadCores(),
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

  const handleRegisterProject = async () => {
    setOpenModal({
      name: modalName.REGISTER_PROJECT,
    });
  };

  useEffect(() => {
    loadDashboardData(selectedAccount);
  }, [selectedAccount, api]);

  useEffect(() => {
    let unsubs: UnsubscribePromise[] = [];
    if (selectedAccount) {
      unsubs = setupSubscriptions({ selectedAccount });
    }

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
  }, [selectedAccount, api, stakingCores]);

  return (
    <div className="overflow-y-scroll mx-auto w-full flex max-w-7xl flex-col justify-between p-4 sm:px-6 lg:px-8 mt-14 md:mt-0 gap-3">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
        <h2 className="lg:text-xl font-bold leading-none my-3 flex flex-row items-center gap-4">
          <span>DAO Staking</span>
          <span>{isLoading || !isDataLoaded ? <LoadingSpinner /> : null}</span>
        </h2>

        {selectedAccount && <div className="flex flex-row w-full md:w-auto gap-2 items-center justify-start z-1">
          <Button
            mini
            onClick={handleRegisterProject}
            disabled={isLoading}
            variant="primary">
            Register New DAO
          </Button>
        </div>}
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

          <DaoList mini={false} />
        </>
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
