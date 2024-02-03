import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ProjectCard from './ProjectCard';
import LoadingSpinner from './LoadingSpinner';
import { ChainPropertiesType, CoreEraStakeInfoType, CoreIndexedRewardsType, StakingCore, TotalRewardsCoreClaimedQuery, TotalUserStakedData, UserStakedInfoType, getTotalUserStaked } from '../routes/staking';
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
import FilterIcon from '../assets/filter-icon.svg';
import { CHOOSE_ONE, FilterStates, OrderByOption } from '../modals/DaoListFilters';
import { clearFiltersFromLocalStorage } from '../utils/filterStorage';
import { useBalance } from '../providers/balance';

interface DaoListProps { mini: boolean; isOverview: boolean; }

const DaoList = (props: DaoListProps) => {
  const { mini, isOverview } = props;
  const api = useApi();
  const initialCoresRef = useRef<StakingCore[]>([]);
  const descriptionRef = useRef<HTMLDivElement | null>(null);
  const projectCardRef = useRef<HTMLDivElement | null>(null);
  const setOpenModal = useModal((state) => state.setOpenModal);
  const { availableBalance } = useBalance();
  const selectedAccount = useAccount((state) => state.selectedAccount);
  const [isLoading, setLoading] = useState(true);
  const [isDataLoaded, setDataLoaded] = useState(false);
  const [stakedDaos, setStakedDaos] = useState<StakedDaoType[]>([]);
  const [stakingCores, setStakingCores] = useState<StakingCore[]>([]);
  const [chainProperties, setChainProperties] = useState<ChainPropertiesType>();
  const [coreEraStakeInfo, setCoreEraStakeInfo] = useState<CoreEraStakeInfoType[]>([]);
  const [coreIndexedRewards, setCoreIndexedRewards] = useState<CoreIndexedRewardsType[]>([]);
  const [totalUserStakedData, setTotalUserStakedData] = useState<TotalUserStakedData>({});
  const [userStakedInfo, setUserStakedInfo] = useState<UserStakedInfoType[]
  >([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [debounceTimeout, setDebounceTimeout] = useState<NodeJS.Timeout | null>(null);
  const [minStakeReward, setMinStakeReward] = useState<BigNumber>(new BigNumber(0));
  const [activeFilterCount, setActiveFilterCount] = useState(0);

  const [rewardsCoreClaimedQuery] = useQuery({
    query: TotalRewardsCoreClaimedQuery,
    variables: {},
    pause: !selectedAccount,
  });

  const handleViewMembers = (core: StakingCore, members: AnyJson[]) => {
    setOpenModal({
      name: modalName.MEMBERS,
      metadata: { ...core.metadata, members },
    });
  };

  const handleReadMore = (core: StakingCore) => {
    setOpenModal({
      name: modalName.READ_MORE,
      metadata: core.metadata,
    });
  };

  const handleFilters = () => {
    setOpenModal({
      name: modalName.FILTERS,
      metadata: { updateFilters }
    });
  };

  const filterStakingCores = useCallback((filters: FilterStates) => {
    let cores = [...initialCoresRef.current];
    let activeFilterCount = 0;

    // Filter by total stakers
    if (filters.totalStakersRange.minValue > 0 || filters.totalStakersRange.maxValue < 1000) {
      activeFilterCount++;
      cores = cores.filter(core => {
        const coreInfo = coreEraStakeInfo.find(info => info.coreId === core.key);
        const totalStakers = coreInfo ? coreInfo.numberOfStakers : 0;
        return totalStakers >= filters.totalStakersRange.minValue && totalStakers <= filters.totalStakersRange.maxValue;
      });
    }

    // Filter by total staked
    if (filters.totalStakedRange.minValue > 0 || filters.totalStakedRange.maxValue < 99999) {
      activeFilterCount++;
      cores = cores.filter(core => {
        const totalStaked = totalUserStakedData[core.key]?.dividedBy(1e12).toNumber() || 0;
        if (filters.totalStakedRange.maxValue === 99999) {
          return totalStaked >= filters.totalStakedRange.minValue;
        } else {
          return totalStaked >= filters.totalStakedRange.minValue && totalStaked <= filters.totalStakedRange.maxValue;
        }
      });
    }

    // Filter by min support met
    if (filters.isMinSupportMet.isIndeterminate) {
      activeFilterCount++;
      cores = cores.filter(core => {
        const coreInfo = coreEraStakeInfo.find(info => info.coreId === core.key);
        const totalStaked = coreInfo ? new BigNumber(coreInfo.totalStaked) : new BigNumber(0);
        return totalStaked.comparedTo(minStakeReward) < 0;
      });
    } else if (filters.isMinSupportMet.isChecked) {
      activeFilterCount++;
      cores = cores.filter(core => {
        const coreInfo = coreEraStakeInfo.find(info => info.coreId === core.key);
        const totalStaked = coreInfo ? new BigNumber(coreInfo.totalStaked) : new BigNumber(0);
        return totalStaked.comparedTo(minStakeReward) >= 0;
      });
    }

    // Filter by my staked DAOs
    if (filters.isMyStakedDAOs.isIndeterminate) {
      activeFilterCount++;
      cores = cores.filter(core => {
        const userStaked = totalUserStakedData[core.key] ?? new BigNumber(0);
        return userStaked.isEqualTo(0);
      });
    } else if (filters.isMyStakedDAOs.isChecked) {
      activeFilterCount++;
      cores = cores.filter(core => {
        const userStaked = totalUserStakedData[core.key] ?? new BigNumber(0);
        return userStaked.isGreaterThan(0);
      });
    }

    // Filter by OrderByOption 
    if (filters.orderBy !== CHOOSE_ONE) {
      activeFilterCount++;
      switch (filters.orderBy) {
        case OrderByOption.NAME_ASCENDING:
          cores = cores.sort((a, b) => a.metadata.name.localeCompare(b.metadata.name));
          break;
        case OrderByOption.NAME_DESCENDING:
          cores = cores.sort((a, b) => b.metadata.name.localeCompare(a.metadata.name));
          break;
        case OrderByOption.TOTAL_STAKED_HIGH:
          cores = cores.sort((a, b) => {
            const aCoreInfo = coreEraStakeInfo.find(info => info.coreId === a.key);
            const bCoreInfo = coreEraStakeInfo.find(info => info.coreId === b.key);
            const aTotalStaked = new BigNumber(aCoreInfo?.totalStaked ?? 0);
            const bTotalStaked = new BigNumber(bCoreInfo?.totalStaked ?? 0);
            return bTotalStaked.comparedTo(aTotalStaked);
          });
          break;
        case OrderByOption.TOTAL_STAKED_LOW:
          cores = cores.sort((a, b) => {
            const aCoreInfo = coreEraStakeInfo.find(info => info.coreId === a.key);
            const bCoreInfo = coreEraStakeInfo.find(info => info.coreId === b.key);
            const aTotalStaked = new BigNumber(aCoreInfo?.totalStaked ?? 0);
            const bTotalStaked = new BigNumber(bCoreInfo?.totalStaked ?? 0);
            return aTotalStaked.comparedTo(bTotalStaked);
          });
          break;
        case OrderByOption.SUPPORT_SHARE_HIGH:
          cores = cores.sort((a, b) => {
            const aCoreInfo = coreEraStakeInfo.find(info => info.coreId === a.key);
            const aTotalStaked = aCoreInfo ? new BigNumber(aCoreInfo.totalStaked) : new BigNumber(0);
            const aSupportShare = aTotalStaked.dividedBy(minStakeReward).multipliedBy(100);
            const bCoreInfo = coreEraStakeInfo.find(info => info.coreId === b.key);
            const bTotalStaked = bCoreInfo ? new BigNumber(bCoreInfo.totalStaked) : new BigNumber(0);
            const bSupportShare = bTotalStaked.dividedBy(minStakeReward).multipliedBy(100);
            return bSupportShare.minus(aSupportShare).toNumber();
          });
          break;
        case OrderByOption.SUPPORT_SHARE_LOW:
          cores = cores.sort((a, b) => {
            const aCoreInfo = coreEraStakeInfo.find(info => info.coreId === a.key);
            const aTotalStaked = aCoreInfo ? new BigNumber(aCoreInfo.totalStaked) : new BigNumber(0);
            const aSupport = aTotalStaked.dividedBy(minStakeReward).multipliedBy(100);
            const bCoreInfo = coreEraStakeInfo.find(info => info.coreId === b.key);
            const bTotalStaked = bCoreInfo ? new BigNumber(bCoreInfo.totalStaked) : new BigNumber(0);
            const bSupport = bTotalStaked.dividedBy(minStakeReward).multipliedBy(100);
            return aSupport.minus(bSupport).toNumber();
          });
          break;
        default:
          console.log('Cannot sort by this option');
          break;
      }
    }

    setStakingCores(cores);
    setActiveFilterCount(activeFilterCount);
  }, [initialCoresRef, coreEraStakeInfo, totalUserStakedData, minStakeReward]);

  const updateFilters = useCallback((filters: FilterStates) => {
    filterStakingCores(filters);
  }, [filterStakingCores]);

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

  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value.toLowerCase();
    setSearchTerm(value);

    if (debounceTimeout) clearTimeout(debounceTimeout);

    const newTimeout = setTimeout(() => {
      if (value === '') {
        setStakingCores(initialCoresRef.current);
      } else {
        const filteredCores = initialCoresRef.current.filter(core =>
          core.metadata.name.toLowerCase().includes(value) ||
          (core.metadata.description && core.metadata.description.toLowerCase().includes(value))
        );
        setStakingCores(filteredCores);
      }
    }, 300);

    setDebounceTimeout(newTimeout);
  };

  const loadStakeRewardMinimum = useCallback(() => {
    const minStakeReward = api.consts.ocifStaking.stakeThresholdForActiveCore.toPrimitive() as string;
    setMinStakeReward(new BigNumber(minStakeReward));
  }, [api]);

  const loadCores = useCallback(async () => {
    if (!selectedAccount) return;

    const cores = await loadProjectCores(api);
    if (cores) {
      initialCoresRef.current = cores; // Store the initial list in the ref
      setStakingCores(cores); // Set the displayed cores to the initial list
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
        clearFiltersFromLocalStorage();
        await loadCores();
        await loadStakingConstants();
        await loadCoreEraStake();
        loadStakeRewardMinimum();
      }

    } catch (error) {
      toast.error(`${ error }`);
    } finally {
      setLoading(false);
      setDataLoaded(true);
    }
  }, [loadCores, loadStakingConstants, loadCoreEraStake, loadStakeRewardMinimum]);

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

  useEffect(() => {
    return () => {
      if (debounceTimeout) clearTimeout(debounceTimeout);
    };
  }, [debounceTimeout]);

  useEffect(() => {
    if (searchTerm === '') {
      setStakingCores(initialCoresRef.current);
    }
  }, [searchTerm]);

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
      <div className='flex flex-col md:flex-row gap-2 md:gap-10 items-stretch md:items-center justify-between mb-4 mt-14 md:mt-0'>
        <h4 className="text-white text-md">{isOverview ? 'My Staked DAOs' : 'All Registered DAOs'} ({stakedCoresCount || '0'})</h4>
        <div className="bg-neutral-950 bg-opacity-50 rounded-lg flex flex-row gap-2 p-4">
          <div className='relative w-full'>
            <Input type="text" id="filterDaos" placeholder='Search' onChange={handleSearch} value={searchTerm} className='pr-12' />
            {searchTerm && <button type='button' className='absolute -translate-x-10 pt-[4px] translate-y-1/2 hover:underline-offset-2 hover:underline text-tinkerYellow text-xxs' onClick={() => setSearchTerm('')}>clear</button>}
          </div>
          <div className='relative'>
            <button type='button' className='rounded-lg bg-tinkerGrey hover:bg-tinkerDarkYellow p-3' onClick={handleFilters}>
              <img src={FilterIcon} alt="Filter" className='h-5 w-5' />
            </button>
            {activeFilterCount > 0 && <span className='absolute -right-[8px] -top-[6px] rounded-full px-[6px] bg-tinkerYellow text-center text-black font-bold text-xxs'>{activeFilterCount}</span>}
          </div>
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
              toggleExpanded={handleReadMore}
              toggleViewMembers={handleViewMembers}
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

