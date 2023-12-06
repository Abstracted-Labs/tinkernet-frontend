import { RefObject, useState } from 'react';
import { BigNumber } from 'bignumber.js';
import { LockClosedIcon } from '@heroicons/react/24/outline';
import { formatBalance } from '@polkadot/util';
import toast from 'react-hot-toast';
import { StakingCore, CoreEraStakedInfoType, ChainPropertiesType } from '../routes/staking';
import { InjectedAccountWithMeta } from '@polkadot/extension-inject/types';
import TotalStakersIcon from '../assets/total-stakers-icon.svg';
import TotalStakedIcon from '../assets/total-staked-icon.svg';
import MyProjectStakeIcon from '../assets/my-project-stake-icon.svg';
import Avatar from './Avatar';

export interface ProjectCardProps {
  core: StakingCore;
  totalUserStaked: BigNumber | undefined;
  coreInfo: CoreEraStakedInfoType | undefined;
  chainProperties: ChainPropertiesType | undefined;
  availableBalance: BigNumber | undefined;
  handleManageStaking: (args: {
    core: StakingCore;
    totalUserStaked: BigNumber;
    availableBalance: BigNumber;
  }) => void;
  descriptionRef: RefObject<HTMLDivElement>;
  toggleExpanded: (core: StakingCore) => void;
  selectedAccount: InjectedAccountWithMeta | null;
}

const ProjectCard = (props: ProjectCardProps) => {
  const {
    core,
    totalUserStaked,
    coreInfo,
    chainProperties,
    availableBalance,
    handleManageStaking,
    descriptionRef,
    toggleExpanded,
    selectedAccount,
  } = props;
  const [isHovered, setIsHovered] = useState(false);

  const handleReadMore = (core: StakingCore) => {
    setIsHovered(!isHovered);
    toggleExpanded(core);
  };

  return (
    <div
      key={core.account}
      className="flex flex-col justify-between w-full bg-tinkerGrey rounded-lg space-y-4">
      <div className='p-8 h-96 flex flex-col justify-between'>
        <div className="flex items-center space-x-4">
          <Avatar src={core.metadata.image} alt="Project Image" />
          <h4 className="font-bold text-white text-[18px] text-center tracking-[0] leading-[normal]">
            {core.metadata.name}
          </h4>
        </div>
        <div ref={descriptionRef} className={`relative bg-tinkerDarkGrey rounded-lg p-4 h-28 hover:cursor-pointer`}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          onClick={() => handleReadMore(core)}>
          <div className={`absolute inset-0 flex justify-center items-center font-normal text-tinkerYellow text-[12px] tracking-[0] leading-[normal] ${ isHovered ? 'opacity-100' : 'opacity-0' } transition duration-100 z-10 pointer-events-none`}>
            Show More
          </div>
          <p className={`font-normal text-white text-[14px] tracking-[0] leading-[18px] line-clamp-4 gradient-bottom hover:text-opacity-20`}>
            {core.metadata.description}
          </p>
        </div>
        <div className="grid grid-cols-1 gap-2">
          <div className="flex justify-between items-center pb-2 border-b border-b-[#2B2C30]">
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
          </div>
          <div className="flex justify-between items-center pb-2 border-b border-b-[#2B2C30]">
            <div className='flex flex-row items-center gap-2'>
              <div className="w-5 h-5 rounded-full bg-tinkerYellow bg-opacity-20 flex items-center justify-center">
                <img src={TotalStakedIcon} alt="Total Staked Icon" />
              </div>
              <div className="font-normal text-tinkerTextGrey text-[12px] tracking-[0] leading-[normal]">
                Total Staked
              </div>
            </div>
            <div className="font-normal text-white text-[12px] text-right tracking-[0] leading-[normal]">
              {formatBalance(coreInfo?.total.toString(), {
                decimals: 12,
                withUnit: false,
                forceUnit: "-",
              }).slice(0, -2)}{" "}
              TNKR
            </div>
          </div>
          <div className="flex justify-between items-center">
            <div className='flex flex-row items-center gap-2'>
              <div className="w-5 h-5 rounded-full bg-tinkerYellow bg-opacity-20 flex items-center justify-center">
                <img src={MyProjectStakeIcon} alt="My Project Stake Icon" />
              </div>
              <div className="font-normal text-tinkerTextGrey text-[12px] tracking-[0] leading-[normal]">
                My Stake
              </div>
            </div>
            <div className="font-normal text-white text-[12px] text-right tracking-[0] leading-[normal]">
              {totalUserStaked
                ? `${ formatBalance(
                  totalUserStaked.toString(),
                  {
                    decimals: 12,
                    withUnit: false,
                    forceUnit: "-",
                  }
                ).slice(0, -2) } TNKR`
                : '--'}
            </div>
          </div>
        </div>
      </div>
      {selectedAccount ? (
        <div className='relative' style={{ margin: 0 }}>
          <button type="button" className="bg-tinkerYellow bg-opacity-20 hover:bg-opacity-100 text-tinkerYellow hover:text-black w-full rounded-bl-lg rounded-br-lg p-4 transition duration-100 disabled:cursor-not-allowed disabled:bg-opacity-20 disabled:hover:bg-opacity-20 disabled:text-black disabled:text-opacity-40"
            onClick={() => {
              const parsedTotalStaked =
                totalUserStaked || new BigNumber("0");

              const parsedAvailableBalance =
                availableBalance?.minus(
                  new BigNumber(10).pow(12).times(2)
                ) || new BigNumber("0");

              handleManageStaking({
                core,
                totalUserStaked: parsedTotalStaked,
                availableBalance:
                  parsedAvailableBalance.isNegative()
                    ? new BigNumber("0")
                    : parsedAvailableBalance,
              });
            }}
            disabled={
              (coreInfo?.numberOfStakers || 0) >=
              (chainProperties?.maxStakersPerCore || 0) &&
              !totalUserStaked
            }>
            <span className="font-base text-[16px] text-center tracking-[0] leading-[normal] whitespace-nowrap">
              Manage Staking
            </span>
          </button>
        </div>
      ) : null}
    </div>
  );
};

export default ProjectCard;