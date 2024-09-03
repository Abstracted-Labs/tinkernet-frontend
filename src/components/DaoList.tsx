import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ProjectCard from './ProjectCard';
import LoadingSpinner from './LoadingSpinner';
import { ChainPropertiesType, DaoEraStakeInfoType, DaoIndexedRewardsType, StakingDao, TotalRewardsDaoClaimedQuery, TotalUserStakedData, UserStakedInfoType, getTotalUserStaked } from '../routes/staking';
import { AnyJson, Codec } from '@polkadot/types/types';
import { StakedDaoType } from '../routes/overview';
import BigNumber from 'bignumber.js';
import { InjectedAccountWithMeta } from '@polkadot/extension-inject/types';
import { loadProjectDaos, loadStakedDaos } from '../utils/stakingServices';
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
import { StakingMetadata } from '../modals/ManageStaking';

interface DaoListProps { mini: boolean; isOverview: boolean; totalStakedInSystem: BigNumber | undefined; }

const DaoList = (props: DaoListProps) => {
  const { mini, isOverview, totalStakedInSystem } = props;
  const api = useApi();
  const initialDaosRef = useRef<StakingDao[]>([]);
  const descriptionRef = useRef<HTMLDivElement | null>(null);
  const projectCardRef = useRef<HTMLDivElement | null>(null);
  const setOpenModal = useModal((state) => state.setOpenModal);
  const { availableBalance } = useBalance();
  const selectedAccount = useAccount((state) => state.selectedAccount);
  const [isLoading, setLoading] = useState(true);
  const [isDataLoaded, setDataLoaded] = useState(false);
  const [stakedDaos, setStakedDaos] = useState<StakedDaoType[]>([]);
  const [stakingDaos, setStakingDaos] = useState<StakingDao[]>([]);
  const [chainProperties, setChainProperties] = useState<ChainPropertiesType>();
  const [daoEraStakeInfo, setDaoEraStakeInfo] = useState<DaoEraStakeInfoType[]>([]);
  const [daoIndexedRewards, setDaoIndexedRewards] = useState<DaoIndexedRewardsType[]>([]);
  const [totalUserStakedData, setTotalUserStakedData] = useState<TotalUserStakedData>({});
  const [userStakedInfo, setUserStakedInfo] = useState<UserStakedInfoType[]
  >([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [debounceTimeout, setDebounceTimeout] = useState<NodeJS.Timeout | null>(null);
  const [minStakeReward, setMinStakeReward] = useState<BigNumber>(new BigNumber(0));
  const [activeFilterCount, setActiveFilterCount] = useState(0);

  const [rewardsCoreClaimedQuery] = useQuery({
    query: TotalRewardsDaoClaimedQuery,
    variables: {},
    pause: !selectedAccount,
  });

  const handleViewMembers = (dao: StakingDao, members: AnyJson[]) => {
    setOpenModal({
      name: modalName.MEMBERS,
      metadata: { ...dao.metadata, members },
    });
  };

  const handleReadMore = (dao: StakingDao) => {
    setOpenModal({
      name: modalName.READ_MORE,
      metadata: dao.metadata,
    });
  };

  const handleFilters = () => {
    setOpenModal({
      name: modalName.FILTERS,
      metadata: { updateFilters }
    });
  };

  const filterStakingCores = useCallback((filters: FilterStates) => {
    let daos = [...initialDaosRef.current];
    let activeFilterCount = 0;

    // Filter by total stakers
    if (filters.totalStakersRange.minValue > 0 || filters.totalStakersRange.maxValue < 1000) {
      activeFilterCount++;
      daos = daos.filter(core => {
        const daoInfo = daoEraStakeInfo.find(info => info.daoId === core.key);
        const totalStakers = daoInfo ? daoInfo.numberOfStakers : 0;
        return totalStakers >= filters.totalStakersRange.minValue && totalStakers <= filters.totalStakersRange.maxValue;
      });
    }

    // Filter by total staked
    if (filters.totalStakedRange.minValue > 0 || filters.totalStakedRange.maxValue < 99999) {
      activeFilterCount++;
      daos = daos.filter(core => {
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
      daos = daos.filter(core => {
        const daoInfo = daoEraStakeInfo.find(info => info.daoId === core.key);
        const totalStaked = daoInfo ? new BigNumber(daoInfo.totalStaked) : new BigNumber(0);
        return totalStaked.comparedTo(minStakeReward) < 0;
      });
    } else if (filters.isMinSupportMet.isChecked) {
      activeFilterCount++;
      daos = daos.filter(core => {
        const daoInfo = daoEraStakeInfo.find(info => info.daoId === core.key);
        const totalStaked = daoInfo ? new BigNumber(daoInfo.totalStaked) : new BigNumber(0);
        return totalStaked.comparedTo(minStakeReward) >= 0;
      });
    }

    // Filter by my staked DAOs
    if (filters.isMyStakedDAOs.isIndeterminate) {
      activeFilterCount++;
      daos = daos.filter(core => {
        const userStaked = totalUserStakedData[core.key] ?? new BigNumber(0);
        return userStaked.isEqualTo(0);
      });
    } else if (filters.isMyStakedDAOs.isChecked) {
      activeFilterCount++;
      daos = daos.filter(core => {
        const userStaked = totalUserStakedData[core.key] ?? new BigNumber(0);
        return userStaked.isGreaterThan(0);
      });
    }

    // Filter by OrderByOption 
    if (filters.orderBy !== CHOOSE_ONE) {
      activeFilterCount++;
      switch (filters.orderBy) {
        case OrderByOption.NAME_ASCENDING:
          daos = daos.sort((a, b) => a.metadata.name.localeCompare(b.metadata.name));
          break;
        case OrderByOption.NAME_DESCENDING:
          daos = daos.sort((a, b) => b.metadata.name.localeCompare(a.metadata.name));
          break;
        case OrderByOption.TOTAL_STAKED_HIGH:
          daos = daos.sort((a, b) => {
            const aDaoInfo = daoEraStakeInfo.find(info => info.daoId === a.key);
            const bDaoInfo = daoEraStakeInfo.find(info => info.daoId === b.key);
            const aTotalStaked = new BigNumber(aDaoInfo?.totalStaked ?? 0);
            const bTotalStaked = new BigNumber(bDaoInfo?.totalStaked ?? 0);
            return bTotalStaked.comparedTo(aTotalStaked);
          });
          break;
        case OrderByOption.TOTAL_STAKED_LOW:
          daos = daos.sort((a, b) => {
            const aDaoInfo = daoEraStakeInfo.find(info => info.daoId === a.key);
            const bDaoInfo = daoEraStakeInfo.find(info => info.daoId === b.key);
            const aTotalStaked = new BigNumber(aDaoInfo?.totalStaked ?? 0);
            const bTotalStaked = new BigNumber(bDaoInfo?.totalStaked ?? 0);
            return aTotalStaked.comparedTo(bTotalStaked);
          });
          break;
        case OrderByOption.SUPPORT_SHARE_HIGH:
          daos = daos.sort((a, b) => {
            const aDaoInfo = daoEraStakeInfo.find(info => info.daoId === a.key);
            const aTotalStaked = aDaoInfo ? new BigNumber(aDaoInfo.totalStaked) : new BigNumber(0);
            const aSupportShare = aTotalStaked.dividedBy(minStakeReward).multipliedBy(100);
            const bDaoInfo = daoEraStakeInfo.find(info => info.daoId === b.key);
            const bTotalStaked = bDaoInfo ? new BigNumber(bDaoInfo.totalStaked) : new BigNumber(0);
            const bSupportShare = bTotalStaked.dividedBy(minStakeReward).multipliedBy(100);
            return bSupportShare.minus(aSupportShare).toNumber();
          });
          break;
        case OrderByOption.SUPPORT_SHARE_LOW:
          daos = daos.sort((a, b) => {
            const aDaoInfo = daoEraStakeInfo.find(info => info.daoId === a.key);
            const aTotalStaked = aDaoInfo ? new BigNumber(aDaoInfo.totalStaked) : new BigNumber(0);
            const aSupport = aTotalStaked.dividedBy(minStakeReward).multipliedBy(100);
            const bDaoInfo = daoEraStakeInfo.find(info => info.daoId === b.key);
            const bTotalStaked = bDaoInfo ? new BigNumber(bDaoInfo.totalStaked) : new BigNumber(0);
            const bSupport = bTotalStaked.dividedBy(minStakeReward).multipliedBy(100);
            return aSupport.minus(bSupport).toNumber();
          });
          break;
        default:
          console.log('Cannot sort by this option');
          break;
      }
    }

    setStakingDaos(daos);
    setActiveFilterCount(activeFilterCount);
  }, [initialDaosRef, daoEraStakeInfo, totalUserStakedData, minStakeReward]);

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
    dao: core,
    totalUserStaked,
    allDaos
  }: StakingMetadata) => {
    setOpenModal({
      name: modalName.MANAGE_STAKING,
      metadata: { ...core, totalUserStaked, stakingDaos, totalUserStakedData, allDaos },
    });
  };

  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value.toLowerCase();
    setSearchTerm(value);

    if (debounceTimeout) clearTimeout(debounceTimeout);

    const newTimeout = setTimeout(() => {
      if (value === '') {
        setStakingDaos(initialDaosRef.current);
      } else {
        const filteredCores = initialDaosRef.current.filter(core =>
          core.metadata.name.toLowerCase().includes(value) ||
          (core.metadata.description && core.metadata.description.toLowerCase().includes(value))
        );
        setStakingDaos(filteredCores);
      }
    }, 300);

    setDebounceTimeout(newTimeout);
  };

  const loadStakeRewardMinimum = useCallback(() => {
    const minStakeReward = api.consts.ocifStaking.stakeThresholdForActiveDao.toPrimitive() as string;
    setMinStakeReward(new BigNumber(minStakeReward));
  }, [api]);

  const loadCores = useCallback(async () => {
    if (!selectedAccount) return;

    const daos = await loadProjectDaos(api);
    if (daos) {
      initialDaosRef.current = daos;
      setStakingDaos(daos);
    }
  }, [selectedAccount, api]);

  const loadTotalUserStaked = useCallback(() => {
    if (!daoEraStakeInfo.length || !userStakedInfo.length) {
      return;
    }

    setTotalUserStakedData(prevState => {
      const totalUserStakedResults: TotalUserStakedData = { ...prevState };
      for (const core of initialDaosRef.current) {
        const totalUserStaked = getTotalUserStaked(userStakedInfo, core);
        totalUserStakedResults[core.key] = totalUserStaked;
      }

      return totalUserStakedResults;
    });
  }, [daoEraStakeInfo, userStakedInfo]);

  const loadStakingConstants = useCallback(async () => {
    const maxStakersPerDao = api.consts.ocifStaking.maxStakersPerDao.toPrimitive() as number;
    const inflationErasPerYear = api.consts.checkedInflation.erasPerYear.toPrimitive() as number;

    setChainProperties({ maxStakersPerDao, inflationErasPerYear });
  }, [api]);

  const loadCoreEraStake = useCallback(async () => {
    const daoEraStakeInfoMap: Map<number, DaoEraStakeInfoType> = new Map();
    const currentEra = await api.query.ocifStaking.currentEra();

    if (daoEraStakeInfo.length === 0) {
      for (const stakingDao of stakingDaos) {
        await api.query.ocifStaking.coreEraStake(stakingDao.key, currentEra, (inf: Codec) => {

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

          daoEraStakeInfoMap.set(stakingDao.key, {
            totalStaked: info.total,
            active: info.active,
            rewardClaimed: info.rewardClaimed,
            numberOfStakers: info.numberOfStakers,
            daoId: stakingDao.key
          });

          const coreEraStake = Array.from(daoEraStakeInfoMap.values());
          setDaoEraStakeInfo(coreEraStake);
        });
      }
    }
  }, [stakingDaos, daoEraStakeInfo.length, api]);

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
      toast.error(`${error}`);
    } finally {
      setLoading(false);
      setDataLoaded(true);
    }
  }, [loadCores, loadStakingConstants, loadCoreEraStake, loadStakeRewardMinimum]);

  const setupSubscriptions = useCallback(async () => {
    if (!selectedAccount) {
      throw new Error("selectedAccount is null");
    };

    const daoEraStakeInfoMap: Map<
      number, DaoEraStakeInfoType> = new Map();

    const userStakedInfoMap: Map<
      number, UserStakedInfoType
    > = new Map();

    const currentEra = await api.query.ocifStaking.currentEra();

    for (const stakingDao of initialDaosRef.current) {
      await api.query.ocifStaking.coreEraStake(stakingDao.key, currentEra, (inf: Codec) => {

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

        daoEraStakeInfoMap.set(stakingDao.key, {
          totalStaked: info.total,
          active: info.active,
          rewardClaimed: info.rewardClaimed,
          numberOfStakers: info.numberOfStakers,
          daoId: stakingDao.key
        });

        const coreEraStake = Array.from(daoEraStakeInfoMap.values());
        setDaoEraStakeInfo(coreEraStake);
      });
    }

    for (const stakingDao of initialDaosRef.current) {

      await api.query.ocifStaking.generalStakerInfo(
        stakingDao.key,
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

          userStakedInfoMap.set(stakingDao.key, {
            daoId: stakingDao.key,
            era: era,
            staked: staked,
          });

          const userStakedInfo = Array.from(userStakedInfoMap.values());
          setUserStakedInfo(userStakedInfo);
        }
      );
    }
  }, [api, selectedAccount]);

  useEffect(() => {
    const setup = async () => {
      if (selectedAccount && typeof setupSubscriptions === 'function') {
        await setupSubscriptions();
      }
    };

    setup();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAccount, stakingDaos]);

  useEffect(() => {
    initializeData(selectedAccount);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedAccount]);

  useEffect(() => {
    loadTotalUserStaked();
  }, [loadTotalUserStaked, daoEraStakeInfo, userStakedInfo, selectedAccount]);

  useEffect(() => {
    const loadDaos = async () => {
      if (!selectedAccount) return;

      const daos = await loadStakedDaos(stakingDaos, selectedAccount.address, api);

      setStakedDaos(daos);
    };

    if (!selectedAccount) return;
    if (!stakingDaos) return;

    loadDaos();
  }, [selectedAccount, stakingDaos, api]);

  useEffect(() => {
    if (!rewardsCoreClaimedQuery.data?.daos?.length || !selectedAccount) return;

    const daoIndexedRewardsMap: DaoIndexedRewardsType[] = rewardsCoreClaimedQuery.data.daos;

    const uniquedaoIndexedRewards = daoIndexedRewardsMap.filter((core, index, self) =>
      index === self.findIndex((item) => item.daoId === core.daoId)
    );

    setDaoIndexedRewards(uniquedaoIndexedRewards);
  }, [selectedAccount, stakingDaos, rewardsCoreClaimedQuery.data]);

  useEffect(() => {
    return () => {
      if (debounceTimeout) clearTimeout(debounceTimeout);
    };
  }, [debounceTimeout]);

  useEffect(() => {
    if (searchTerm === '') {
      setStakingDaos(initialDaosRef.current);
    }
  }, [searchTerm]);

  const stakedCoresCount = useMemo(() => {
    return isOverview
      ? stakingDaos.filter(core =>
        totalUserStakedData[core.key] && (totalUserStakedData[core.key] as BigNumber).isGreaterThan(0)
      ).length
      : stakingDaos.length;
  }, [isOverview, stakingDaos, totalUserStakedData]);

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
        {stakingDaos.map((dao: StakingDao) => {
          const daoInfo = daoEraStakeInfo.find((info) => info.daoId === dao.key);
          const coreRewards = daoIndexedRewards.find((info) => info.daoId === dao.key);
          const userStaked = totalUserStakedData[dao.key] ? totalUserStakedData[dao.key] : new BigNumber(0);

          // If userStaked is zero, don't render the card
          if (isOverview && userStaked && userStaked.isEqualTo(0)) {
            return null;
          }

          const projectCard = (minified: boolean) => (
            <ProjectCard
              mini={minified}
              members={stakedDaos.find((dao) => dao.key === dao.key)?.members as AnyJson[] || []}
              dao={dao}
              totalUserStaked={userStaked}
              daoInfo={daoInfo}
              coreRewards={coreRewards}
              handleManageStaking={handleManageStaking}
              handleViewDetails={(mini) => handleViewDetails(mini, projectCard(false))}
              toggleExpanded={handleReadMore}
              toggleViewMembers={handleViewMembers}
              chainProperties={chainProperties}
              availableBalance={availableBalance}
              descriptionRef={minified ? projectCardRef : descriptionRef}
              selectedAccount={selectedAccount}
              totalStakedInSystem={totalStakedInSystem || new BigNumber(0)}
              allDaos={initialDaosRef.current}
            />
          );

          return (
            <div className="relative" key={dao.key}>
              {projectCard(mini)}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default DaoList;

