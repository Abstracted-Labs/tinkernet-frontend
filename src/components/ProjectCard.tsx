import { RefObject, useCallback, useEffect, useState } from 'react';
import { BigNumber } from 'bignumber.js';
import { LockClosedIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import { StakingCore, CoreEraStakeInfoType, ChainPropertiesType } from '../routes/staking';
import { InjectedAccountWithMeta } from '@polkadot/extension-inject/types';
import TotalStakersIcon from '../assets/total-stakers-icon.svg';
import TotalStakedIcon from '../assets/total-staked-icon.svg';
import MyProjectStakeIcon from '../assets/my-project-stake-icon.svg';
import ClaimedRewardsIcon from '../assets/claimed-rewards-icon.svg';
import UnclaimedRewardsIcon from '../assets/unclaimed-rewards-icon.svg';
import SupportShareIcon from '../assets/support-share-icon.svg';
import MinSupportIcon from '../assets/min-support-icon.svg';
import Avatar from './Avatar';
import { AnyJson } from '@polkadot/types/types';
import useApi from '../hooks/useApi';
import { formatNumberShorthand } from '../utils/formatNumber';
import Button from './Button';
import { BG_GRADIENT } from '../utils/consts';
export interface ProjectCardProps {
  core: StakingCore;
  totalUserStaked: BigNumber | undefined;
  coreInfo: Partial<CoreEraStakeInfoType> | undefined;
  chainProperties: ChainPropertiesType | undefined;
  availableBalance: BigNumber | undefined;
  handleManageStaking: (args: {
    core: StakingCore;
    totalUserStaked: BigNumber;
    availableBalance: BigNumber;
  }) => void;
  handleViewDetails?: (mini: boolean) => void;
  descriptionRef: RefObject<HTMLDivElement>;
  toggleExpanded: (core: StakingCore) => void;
  toggleViewMembers: (core: StakingCore, members: AnyJson[]) => void;
  selectedAccount: InjectedAccountWithMeta | null;
  members: AnyJson[];
  mini: boolean;
}

const STAT_UNDERLINE = 'pb-2 border-b border-b-[#2B2C30]';

const ProjectCard = (props: ProjectCardProps) => {
  const {
    core,
    totalUserStaked: totalStaked,
    coreInfo,
    chainProperties,
    availableBalance,
    handleManageStaking,
    handleViewDetails,
    descriptionRef,
    toggleExpanded,
    toggleViewMembers,
    selectedAccount,
    members,
    mini
  } = props;
  const [isHovered, setIsHovered] = useState(false);
  const [aggregateStaked, setAggregateStaked] = useState<BigNumber>(new BigNumber("0"));
  const [minStakeReward, setMinStakeReward] = useState<BigNumber>(new BigNumber("0"));
  const [minSupportMet, setMinSupportMet] = useState<boolean>(false);
  const [totalUserStaked, setTotalUserStaked] = useState<BigNumber>(new BigNumber("0"));
  const api = useApi();

  const handleReadMore = (event: React.MouseEvent) => {
    event.stopPropagation();

    setIsHovered(!isHovered);
    toggleExpanded(core);
  };

  const handleViewMembers = (event: React.MouseEvent) => {
    event.stopPropagation();

    toggleViewMembers(core, members);
  };

  const loadAggregateStaked = useCallback(async () => {
    const totalIssuance = (await api.query.balances.totalIssuance()).toPrimitive() as string;
    const inactiveIssuance = (await api.query.balances.inactiveIssuance()).toPrimitive() as string;
    setAggregateStaked(new BigNumber(totalIssuance).minus(new BigNumber(inactiveIssuance)));
  }, [api]);

  const loadStakeRewardMinimum = useCallback(() => {
    const minStakeReward = api.consts.ocifStaking.stakeThresholdForActiveCore.toPrimitive() as string;
    setMinStakeReward(new BigNumber(minStakeReward));
  }, [api]);

  const calcMinSupportMet = useCallback(() => {
    if (minStakeReward.isLessThan(coreInfo?.totalStaked || new BigNumber("0"))) {
      setMinSupportMet(true);
    } else {
      setMinSupportMet(false);
    }
  }, [minStakeReward, coreInfo]);

  const handleClick = (event: React.MouseEvent) => {
    event.stopPropagation();

    const parsedTotalStaked = totalUserStaked || new BigNumber("0");

    const parsedAvailableBalance = availableBalance && availableBalance.isNegative()
      ? new BigNumber("0")
      : availableBalance || new BigNumber("0");

    if (handleViewDetails && mini) {
      handleViewDetails(mini);
      return;
    }

    handleManageStaking({
      core,
      totalUserStaked: parsedTotalStaked,
      availableBalance: parsedAvailableBalance,
    });
  };

  useEffect(() => {
    loadAggregateStaked();
    loadStakeRewardMinimum();
  }, [loadAggregateStaked, loadStakeRewardMinimum]);

  useEffect(() => {
    calcMinSupportMet();
  }, [calcMinSupportMet]);

  useEffect(() => {
    if (totalStaked !== undefined) {
      setTotalUserStaked(totalStaked);
    }
  }, [totalStaked]);

  return (
    <div
      key={core.account}
      className={`flex flex-col justify-between w-full rounded-xl space-y-4 border border-2 border-neutral-700 ${ BG_GRADIENT }`}>
      <div className={`relative p-8 flex flex-col gap-6 justify-start h-auto`}>

        {/* Avatar, Name, Members */}
        <div className="flex items-center space-x-4">
          <Avatar src={core.metadata.image} alt="Project Image" />
          <div className="flex flex-col items-start gap-1 justify-start">
            <h4 className="font-bold text-white text-[18px] text-left tracking-[0] leading-none">
              {core.metadata.name}
            </h4>
            {!mini ? <span onClick={handleViewMembers} className="text-xs text-tinkerTextGrey hover:text-tinkerYellow cursor-pointer">Members: {members ? members.length : 0}</span> : null}
          </div>
        </div>

        {/* Description */}
        {!mini ? <div ref={descriptionRef} className={`relative bg-tinkerGrey rounded-lg p-4 h-28 hover:cursor-pointer`}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          onClick={handleReadMore}>
          <div className={`absolute inset-0 flex justify-center items-center font-normal text-tinkerYellow text-[12px] tracking-[0] leading-[normal] ${ isHovered ? 'opacity-100' : 'md:opacity-0 opacity-100' } transition duration-100 z-10 pointer-events-none`}>
            Show More
          </div>
          <p className={`font-normal text-white text-[14px] tracking-[0] leading-[18px] line-clamp-4 gradient-bottom hover:text-opacity-20 text-opacity-20 md:text-opacity-100`}>
            {core.metadata.description}
          </p>
        </div> : null}

        <div className={`relative h-24 stats-section grid grid-cols-1 gap-2 ${ !mini ? 'tinker-scrollbar scrollbar scrollbar-thin pr-4 overflow-y-scroll' : '' }`}>

          {/* Total Stakers */}
          {!mini ? <div className={`stats flex justify-between items-center ${ STAT_UNDERLINE }`}>
            <div className='flex flex-row items-center gap-2'>
              <div className="w-5 h-5 rounded-full bg-tinkerYellow bg-opacity-20 flex items-center justify-center">
                <img src={TotalStakersIcon} alt="Total Stakers Icon" />
              </div>
              <div className="font-normal text-tinkerTextGrey text-[12px] tracking-[0] leading-[normal]">
                Total Stakers
              </div>
            </div>
            <div className="font-normal text-white text-[12px] text-right tracking-[0] leading-[normal] flex flex-row items-center gap-1">
              {(coreInfo?.numberOfStakers || 0) >=
                (chainProperties?.maxStakersPerCore || 0) ? (
                <LockClosedIcon
                  className="h-3 w-3 cursor-pointer text-white"
                  onClick={() => {
                    toast.error(
                      "This core has reached the staker limit"
                    );
                  }}
                />
              ) : null}
              <span>{coreInfo?.numberOfStakers}</span>
            </div>
          </div> : null}

          {/* Total Staked */}
          {!mini ? <div className={`stats flex justify-between items-center ${ STAT_UNDERLINE }`}>
            <div className='flex flex-row items-center gap-2'>
              <div className="w-5 h-5 rounded-full bg-tinkerYellow bg-opacity-20 flex items-center justify-center">
                <img src={TotalStakedIcon} alt="Total Staked Icon" />
              </div>
              <div className="font-normal text-tinkerTextGrey text-[12px] tracking-[0] leading-[normal]">
                Total Staked
              </div>
            </div>
            <div className="font-normal text-white text-[12px] text-right tracking-[0] leading-[normal] truncate">
              {coreInfo?.totalStaked
                ? `${ formatNumberShorthand(parseFloat(coreInfo?.totalStaked.toString()) / Math.pow(10, 12)) } TNKR`
                : '--'}
            </div>
          </div> : null}

          {/* My Stake */}
          <div className={`stats flex justify-between items-center ${ !mini ? STAT_UNDERLINE : '' }`}>
            <div className='flex flex-row items-center gap-2'>
              <div className="w-5 h-5 rounded-full bg-tinkerYellow bg-opacity-20 flex items-center justify-center">
                <img src={MyProjectStakeIcon} alt="My Project Stake Icon" />
              </div>
              <div className="font-normal text-tinkerTextGrey text-[12px] tracking-[0] leading-[normal]">
                My Stake
              </div>
            </div>
            <div className="font-normal text-white text-[12px] text-right tracking-[0] leading-[normal] truncate">
              {totalUserStaked
                ? `${ formatNumberShorthand(parseFloat(totalUserStaked.toString()) / Math.pow(10, 12)) } TNKR`
                : '--'}
            </div>
          </div>

          {/* Total Rewards */}
          {!mini ? <div className={`stats flex justify-between items-center ${ STAT_UNDERLINE }`}>
            <div className='flex flex-row items-center gap-2'>
              <div className="w-5 h-5 rounded-full bg-tinkerYellow bg-opacity-20 flex items-center justify-center">
                <img src={ClaimedRewardsIcon} alt="Total Staked Icon" />
              </div>
              <div className="font-normal text-tinkerTextGrey text-[12px] tracking-[0] leading-[normal]">
                Total Rewards
              </div>
            </div>
            <div className="font-normal text-white text-[12px] text-right tracking-[0] leading-[normal] truncate">
              {coreInfo?.totalRewards
                ? `${ formatNumberShorthand(parseFloat(coreInfo?.totalRewards.toString()) / Math.pow(10, 12)) } TNKR`
                : '--'}
            </div>
          </div> : null}

          {/* Unclaimed Rewards */}
          {!mini ? <div className={`stats flex justify-between items-center ${ STAT_UNDERLINE }`}>
            <div className='flex flex-row items-center gap-2'>
              <div className="w-5 h-5 rounded-full bg-tinkerYellow bg-opacity-20 flex items-center justify-center">
                <img src={UnclaimedRewardsIcon} alt="Total Staked Icon" />
              </div>
              <div className="font-normal text-tinkerTextGrey text-[12px] tracking-[0] leading-[normal]">
                Unclaimed Rewards
              </div>
            </div>
            <div className="font-normal text-white text-[12px] text-right tracking-[0] leading-[normal] truncate">
              {coreInfo?.totalUnclaimed
                ? `${ formatNumberShorthand(parseFloat(coreInfo?.totalUnclaimed.toString()) / Math.pow(10, 12)) } TNKR`
                : '--'}
            </div>
          </div> : null}

          {/* Support Share */}
          {!mini ? <div className={`stats flex justify-between items-center ${ STAT_UNDERLINE }`}>
            <div className='flex flex-row items-center gap-2'>
              <div className="w-5 h-5 rounded-full bg-tinkerYellow bg-opacity-20 flex items-center justify-center">
                <img src={SupportShareIcon} alt="Total Staked Icon" />
              </div>
              <div className="font-normal text-tinkerTextGrey text-[12px] tracking-[0] leading-[normal]">
                Support Share
              </div>
            </div>
            <div className="font-normal text-white text-[12px] text-right tracking-[0] leading-[normal] truncate">
              {coreInfo?.totalStaked && aggregateStaked
                ? `${ new BigNumber(coreInfo?.totalStaked).times(100).div(aggregateStaked).toFixed(2) }%`
                : '--'}
            </div>
          </div> : null}

          {/* Minimum Support */}
          {!mini ? <div className="stats flex justify-between items-center">
            <div className='flex flex-row items-center gap-2'>
              <div className="w-5 h-5 rounded-full bg-tinkerYellow bg-opacity-20 flex items-center justify-center">
                <img src={MinSupportIcon} alt="Total Staked Icon" />
              </div>
              <div className="font-normal text-tinkerTextGrey text-[12px] tracking-[0] leading-[normal]">
                Min. Support Met
              </div>
            </div>
            <div className="text-white font-normal text-[12px] text-right tracking-[0] leading-[normal] truncate">
              <span className={`${ minSupportMet ? 'text-green-400' : 'text-red-400' }`}>
                {coreInfo?.totalStaked && minStakeReward
                  ? `${ minSupportMet ? '25K' : formatNumberShorthand(parseFloat(coreInfo?.totalStaked.toString()) / Math.pow(10, 12)) }/${ formatNumberShorthand(parseFloat(minStakeReward.toString()) / Math.pow(10, 12)) }`
                  : '--'}
              </span> TNKR
            </div>
          </div> : null}
        </div>
        {selectedAccount ? <Button variant='primary' mini={true} onClick={handleClick}
          disabled={
            (coreInfo?.numberOfStakers || 0) >=
            (chainProperties?.maxStakersPerCore || 0) &&
            !totalUserStaked
          }>{!mini ? 'Manage Staking' : 'View Details'}</Button> : null}
      </div>
    </div>
  );
};

export default ProjectCard;