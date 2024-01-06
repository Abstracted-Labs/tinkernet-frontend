import { useEffect, useRef, useState } from 'react';
import ProjectCard from './ProjectCard';
import LoadingSpinner from './LoadingSpinner';
import { BalanceType, ChainPropertiesType, CoreEraStakeInfoType, LockedType, StakingCore, TotalRewardsCoreClaimedQuery, TotalUserStakedData, UserStakedInfoType, getCoreInfo, getTotalUserStaked } from '../routes/staking';
import { AnyJson, Codec } from '@polkadot/types/types';
import { StakedDaoType } from '../routes/overview';
import BigNumber from 'bignumber.js';
import { InjectedAccountWithMeta } from '@polkadot/extension-inject/types';
import { loadProjectCores, loadStakedDaos } from '../utils/stakingServices';
import useApi from '../hooks/useApi';
import { toast } from 'react-hot-toast';
import useAccount from '../stores/account';
import { useQuery } from 'urql';
import { UnsubscribePromise } from '@polkadot/api/types';
import { StakesInfo } from '../routes/claim';
import useModal, { modalName } from '../stores/modals';

interface DaoListProps { mini: boolean; isOverview: boolean; }

const DaoList = (props: DaoListProps) => {
  const { mini, isOverview } = props;
  const api = useApi();
  const descriptionRef = useRef<HTMLDivElement | null>(null);
  const projectCardRef = useRef<HTMLDivElement | null>(null);
  const setOpenModal = useModal((state) => state.setOpenModal);
  const selectedAccount = useAccount((state) => state.selectedAccount);
  const [isLoading, setLoading] = useState(true);
  const [isDataLoaded, setDataLoaded] = useState(false);
  const [stakedDaos, setStakedDaos] = useState<StakedDaoType[]>([]);
  const [stakingCores, setStakingCores] = useState<StakingCore[]>([]);
  const [availableBalance, setAvailableBalance] = useState<BigNumber>();
  const [chainProperties, setChainProperties] = useState<ChainPropertiesType>();
  const [coreEraStakeInfo, setCoreEraStakeInfo] = useState<CoreEraStakeInfoType[]>([]);
  const [totalUserStakedData, setTotalUserStakedData] = useState<TotalUserStakedData>({});
  const [userStakedInfo, setUserStakedInfo] = useState<UserStakedInfoType[]
  >([]);
  const [currentStakingEra, setCurrentStakingEra] = useState<number>(0);

  const [rewardsCoreClaimedQuery, reexecuteQuery] = useQuery({
    query: TotalRewardsCoreClaimedQuery,
    variables: {}
  });

  const toggleViewMembers = (core: StakingCore, members: AnyJson[]) => {
    setOpenModal({
      name: modalName.MEMBERS,
      metadata: { ...core.metadata, members },
    });
  };

  const toggleReadMore = (core: StakingCore) => {
    setOpenModal({
      name: modalName.READ_MORE,
      metadata: core.metadata,
    });
  };

  const handleViewDetails = (mini: boolean, children?: JSX.Element) => {
    if (!mini || !children) return;
    setOpenModal({
      name: modalName.VIEW_DETAILS,
      metadata: { children },
    });
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

  const loadDaos = async () => {
    if (!selectedAccount) return;
    const daos = await loadStakedDaos(stakingCores, selectedAccount.address, api);
    setStakedDaos(daos);
  };

  const loadCores = async () => {
    const cores = await loadProjectCores(api);

    if (cores) {
      setStakingCores(cores);
    }
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

  const loadAccountInfo = async (selectedAccount: InjectedAccountWithMeta) => {
    const account = await api.query.system.account(selectedAccount.address);
    const balance = account.toPrimitive() as BalanceType;
    const locked = (await api.query.ocifStaking.ledger(selectedAccount.address)).toPrimitive() as LockedType;
    const currentBalance = new BigNumber(balance.data.free).minus(new BigNumber(locked.locked));

    setAvailableBalance(currentBalance);
  };

  const loadStakingConstants = async () => {
    const maxStakersPerCore = api.consts.ocifStaking.maxStakersPerCore.toPrimitive() as number;
    const inflationErasPerYear = api.consts.checkedInflation.erasPerYear.toPrimitive() as number;

    setChainProperties({ maxStakersPerCore, inflationErasPerYear });
  };

  const loadDashboardData = async (selectedAccount: InjectedAccountWithMeta | null) => {
    try {
      if (selectedAccount) {
        await Promise.all([
          loadAccountInfo(selectedAccount),
          loadCores(),
          loadStakingConstants()
        ]);
      }

    } catch (error) {
      toast.error(`${ error }`);
    } finally {
      setLoading(false);
      setDataLoaded(true);
    }
  };

  const setupSubscriptions = async ({
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

    const coreEraStakeInfoMap: Map<
      number, CoreEraStakeInfoType> = new Map();

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
            console.log('Array.from(userStakedInfoMap.values())', Array.from(userStakedInfoMap.values()));
            setUserStakedInfo(Array.from(userStakedInfoMap.values()));

            const coreEraStake = coreEraStakeInfo.find(info => info.coreId === stakingCore.key);

            if (coreEraStake) {
              coreEraStakeInfoMap.set(stakingCore.key, {
                ...coreEraStake,
              });

              setCoreEraStakeInfo(Array.from(coreEraStakeInfoMap.values()));
            }
          }
        );
      }
    }

    return Promise.resolve(unsubs as UnsubscribePromise[]);
  };

  useEffect(() => {
    loadDashboardData(selectedAccount);
  }, [selectedAccount, api]);

  useEffect(() => {
    if (!selectedAccount) return;
    if (!stakingCores) return;
    loadDaos();
  }, [selectedAccount, stakingCores, api]);

  useEffect(() => {
    loadTotalUserStaked();
  }, [selectedAccount, stakingCores]);

  useEffect(() => {
    if (selectedAccount) {
      reexecuteQuery();
    }
  }, [selectedAccount]);

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
  }, [selectedAccount, api, stakingCores]);

  const loadingSpinner = <div className='flex items-center justify-center'>
    <LoadingSpinner />
  </div>;

  if (isLoading || !isDataLoaded) {
    return loadingSpinner;
  }

  return (
    <>
      <h4 className="text-white text-md">{isOverview ? 'My Staked DAOs' : 'All Registered DAOs'} ({stakingCores.length ?? '0'})</h4>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {stakingCores.map((core: StakingCore) => {
          const coreInfo = coreEraStakeInfo.find((info) => info.coreId === core.key);
          const userStaked = totalUserStakedData[core.key] || new BigNumber(0);

          const projectCard = (minified: boolean) => (
            <ProjectCard
              mini={minified}
              members={stakedDaos.find((dao) => dao.key === core.key)?.members as AnyJson[] || []}
              core={core}
              totalUserStaked={userStaked}
              coreInfo={coreInfo}
              handleManageStaking={handleManageStaking}
              handleViewDetails={(mini) => handleViewDetails(mini, projectCard(false))}
              toggleExpanded={toggleReadMore}
              toggleViewMembers={toggleViewMembers}
              chainProperties={chainProperties}
              availableBalance={availableBalance}
              descriptionRef={minified ? projectCardRef : descriptionRef}
              selectedAccount={selectedAccount}
            />
          );

          return (
            <div className="relative" key={core.key}>
              {projectCard(mini)}
            </div>
          );
        })}
      </div>
    </>
  );
};

export default DaoList;
