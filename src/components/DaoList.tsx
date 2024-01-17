import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ProjectCard from './ProjectCard';
import LoadingSpinner from './LoadingSpinner';
import { BalanceType, ChainPropertiesType, CoreEraStakeInfoType, CoreIndexedRewardsType, LockedType, StakingCore, TotalRewardsCoreClaimedQuery, TotalUserStakedData, UserStakedInfoType, getTotalUserStaked } from '../routes/staking';
import { AnyJson, Codec } from '@polkadot/types/types';
import { StakedDaoType } from '../routes/overview';
import BigNumber from 'bignumber.js';
import { InjectedAccountWithMeta } from '@polkadot/extension-inject/types';
import { loadProjectCores, loadStakedDaos } from '../utils/stakingServices';
import useApi from '../hooks/useApi';
import { toast } from 'react-hot-toast';
import useAccount from '../stores/account';
import { useQuery } from 'urql';
import { StakesInfo } from '../routes/claim';
import useModal, { modalName } from '../stores/modals';
import Input from './Input';
import Button from './Button';
import FilterIcon from '../assets/filter-icon.svg';

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
  const [coreIndexedRewards, setCoreIndexedRewards] = useState<CoreIndexedRewardsType[]>([]);
  const [totalUserStakedData, setTotalUserStakedData] = useState<TotalUserStakedData>({});
  const [userStakedInfo, setUserStakedInfo] = useState<UserStakedInfoType[]
  >([]);

  const [rewardsCoreClaimedQuery] = useQuery({
    query: TotalRewardsCoreClaimedQuery,
    variables: {},
    pause: !selectedAccount,
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

  const loadCores = useCallback(async () => {
    if (!selectedAccount) return;

    const cores = await loadProjectCores(api);
    if (cores) {
      setStakingCores(cores);
    }
  }, [selectedAccount, api]);

  const loadTotalUserStaked = useCallback(() => {
    if (!coreEraStakeInfo.length || !userStakedInfo.length) {
      return;
    }

    setTotalUserStakedData(prevState => {
      const totalUserStakedResults: TotalUserStakedData = { ...prevState };
      for (const core of stakingCores) {
        const totalUserStaked = getTotalUserStaked(userStakedInfo, core);
        totalUserStakedResults[core.key] = totalUserStaked;
      }

      return totalUserStakedResults;
    });
  }, [stakingCores, coreEraStakeInfo, userStakedInfo]);

  const loadAccountInfo = useCallback(async () => {
    if (!selectedAccount) return;
    const account = await api.query.system.account(selectedAccount.address);
    const balance = account.toPrimitive() as BalanceType;
    const locked = (await api.query.ocifStaking.ledger(selectedAccount.address)).toPrimitive() as LockedType;
    const currentBalance = new BigNumber(balance.data.free).minus(new BigNumber(locked.locked));

    setAvailableBalance(currentBalance);
  }, [api, selectedAccount]);

  const loadStakingConstants = useCallback(async () => {
    const maxStakersPerCore = api.consts.ocifStaking.maxStakersPerCore.toPrimitive() as number;
    const inflationErasPerYear = api.consts.checkedInflation.erasPerYear.toPrimitive() as number;

    setChainProperties({ maxStakersPerCore, inflationErasPerYear });
  }, [api]);

  const loadCoreEraStake = useCallback(async () => {
    const coreEraStakeInfoMap: Map<number, CoreEraStakeInfoType> = new Map();
    const currentEra = await api.query.ocifStaking.currentEra();

    if (coreEraStakeInfo.length === 0) {
      for (const stakingCore of stakingCores) {
        await api.query.ocifStaking.coreEraStake(stakingCore.key, currentEra, (inf: Codec) => {

          const info: {
            total: string;
            numberOfStakers: number;
            rewardClaimed: boolean;
            active: boolean;
          } = inf.toPrimitive() as {
            total: string;
            numberOfStakers: number;
            rewardClaimed: boolean;
            active: boolean;
          };

          coreEraStakeInfoMap.set(stakingCore.key, {
            totalStaked: info.total,
            active: info.active,
            rewardClaimed: info.rewardClaimed,
            numberOfStakers: info.numberOfStakers,
            coreId: stakingCore.key
          });

          const coreEraStake = Array.from(coreEraStakeInfoMap.values());
          setCoreEraStakeInfo(coreEraStake);
        });
      }
    }
  }, [stakingCores, coreEraStakeInfo.length, api]);

  const initializeData = useCallback(async (selectedAccount: InjectedAccountWithMeta | null) => {
    try {
      if (selectedAccount) {
        await loadAccountInfo();
        await loadCores();
        await loadStakingConstants();
        await loadCoreEraStake();
      }

    } catch (error) {
      toast.error(`${ error }`);
    } finally {
      setLoading(false);
      setDataLoaded(true);
    }
  }, [loadAccountInfo, loadCores, loadStakingConstants, loadCoreEraStake]);

  const setupSubscriptions = useCallback(async () => {
    if (!selectedAccount) {
      throw new Error("selectedAccount is null");
    };

    const coreEraStakeInfoMap: Map<
      number, CoreEraStakeInfoType> = new Map();

    const userStakedInfoMap: Map<
      number, UserStakedInfoType
    > = new Map();

    const currentEra = await api.query.ocifStaking.currentEra();

    for (const stakingCore of stakingCores) {
      await api.query.ocifStaking.coreEraStake(stakingCore.key, currentEra, (inf: Codec) => {

        const info: {
          total: string;
          numberOfStakers: number;
          rewardClaimed: boolean;
          active: boolean;
        } = inf.toPrimitive() as {
          total: string;
          numberOfStakers: number;
          rewardClaimed: boolean;
          active: boolean;
        };

        coreEraStakeInfoMap.set(stakingCore.key, {
          totalStaked: info.total,
          active: info.active,
          rewardClaimed: info.rewardClaimed,
          numberOfStakers: info.numberOfStakers,
          coreId: stakingCore.key
        });

        const coreEraStake = Array.from(coreEraStakeInfoMap.values());
        setCoreEraStakeInfo(coreEraStake);
      });
    }

    for (const stakingCore of stakingCores) {

      await api.query.ocifStaking.generalStakerInfo(
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

          const userStakedInfo = Array.from(userStakedInfoMap.values());
          setUserStakedInfo(userStakedInfo);
        }
      );
    }
  }, [api, stakingCores, selectedAccount]);

  useEffect(() => {
    const setup = async () => {
      if (selectedAccount && typeof setupSubscriptions === 'function') {
        await setupSubscriptions();
      }
    };
    setup();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAccount, stakingCores]);

  useEffect(() => {
    initializeData(selectedAccount);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAccount]);

  useEffect(() => {
    loadTotalUserStaked();
  }, [loadTotalUserStaked, coreEraStakeInfo, userStakedInfo, selectedAccount]);

  useEffect(() => {
    const loadDaos = async () => {
      if (!selectedAccount) return;
      const daos = await loadStakedDaos(stakingCores, selectedAccount.address, api);
      setStakedDaos(daos);
    };
    if (!selectedAccount) return;
    if (!stakingCores) return;

    loadDaos();
  }, [selectedAccount, stakingCores, api]);

  useEffect(() => {
    if (!rewardsCoreClaimedQuery.data?.cores?.length || !selectedAccount) return;

    const coreIndexedRewardsMap: CoreIndexedRewardsType[] = rewardsCoreClaimedQuery.data.cores;

    const uniqueCoreIndexedRewards = coreIndexedRewardsMap.filter((core, index, self) =>
      index === self.findIndex((item) => item.coreId === core.coreId)
    );

    setCoreIndexedRewards(uniqueCoreIndexedRewards);
  }, [selectedAccount, stakingCores, rewardsCoreClaimedQuery.data]);

  const stakedCoresCount = useMemo(() => {
    return isOverview
      ? stakingCores.filter(core =>
        totalUserStakedData[core.key] && (totalUserStakedData[core.key] as BigNumber).isGreaterThan(0)
      ).length
      : stakingCores.length;
  }, [isOverview, stakingCores, totalUserStakedData]);

  const loadingSpinner = <div className='flex items-center justify-center'>
    <LoadingSpinner />
  </div>;

  if (isLoading || !isDataLoaded) {
    return loadingSpinner;
  }

  return (
    <div>
      <div className='flex flex-col md:flex-row gap-2 md:gap-10 items-stretch md:items-center justify-between mb-4'>
        <h4 className="text-white text-md">{isOverview ? 'My Staked DAOs' : 'All Registered DAOs'} ({stakedCoresCount || '0'})</h4>
        <div className="bg-neutral-950 bg-opacity-50 rounded-lg flex flex-row items-stretch gap-2 p-4">
          <Input placeholder='Search' onChange={(e) => console.log(e.target.value)} />
          <button type='button' className='rounded-lg bg-tinkerGrey hover:bg-tinkerDarkYellow p-3'>
            <img src={FilterIcon} alt="Filter" className='h-5 w-5' />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {stakingCores.map((core: StakingCore) => {
          const coreInfo = coreEraStakeInfo.find((info) => info.coreId === core.key);
          const coreRewards = coreIndexedRewards.find((info) => info.coreId === core.key);
          const userStaked = totalUserStakedData[core.key] ? totalUserStakedData[core.key] : new BigNumber(0);

          // If userStaked is zero, don't render the card
          if (isOverview && userStaked && userStaked.isEqualTo(0)) {
            return null;
          }

          const projectCard = (minified: boolean) => (
            <ProjectCard
              mini={minified}
              members={stakedDaos.find((dao) => dao.key === core.key)?.members as AnyJson[] || []}
              core={core}
              totalUserStaked={userStaked}
              coreInfo={coreInfo}
              coreRewards={coreRewards}
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
    </div>
  );
};

export default DaoList;

