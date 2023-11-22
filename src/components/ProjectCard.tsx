import React, { RefObject } from 'react';
import { BigNumber } from 'bignumber.js';
import { LockClosedIcon, UserGroupIcon } from '@heroicons/react/24/outline';
import { formatBalance } from '@polkadot/util';
import toast from 'react-hot-toast';
import { StakingCore, CoreEraStakedInfoType, ChainPropertiesType } from '../routes/staking';
import { InjectedAccountWithMeta } from '@polkadot/extension-inject/types';

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
  expandedCore: string | null;
  toggleExpanded: (coreAccount: string) => void;
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
    expandedCore,
    toggleExpanded,
    selectedAccount,
  } = props;
  return (
    <div
      key={core.account}
      className="relative flex flex-col gap-4 overflow-hidden rounded-md p-4 sm:flex-row border border-neutral-50 backdrop-blur-sm"
    >
      <div className="flex w-full flex-col gap-4 justify-between">
        <div className="h-72">
          <div className="flex flex-row items-center gap-4">
            <div className="flex flex-shrink-0">
              <img
                src={core.metadata.image}
                alt={core.metadata.name}
                className="h-16 w-16 rounded-full"
              />
            </div>
            <h4 className="font-bold">{core.metadata.name}</h4>
          </div>

          <div ref={descriptionRef} className={`mt-3 overflow-y-scroll ${ expandedCore !== core.account ? '' : 'h-[73%] tinker-scrollbar scrollbar scrollbar-thumb-amber-300 scrollbar-thin pr-3' }`}>
            <div>
              <p
                className={`relative text-sm overflow-hidden transition-all duration-200 ${ expandedCore !== core.account ? "line-clamp-2 gradient-bottom" : "" }`}
                onClick={() => toggleExpanded(core.account)}
              >
                {core.metadata.description}
              </p>
              <button
                className={`flex flex-row text-xs items-center gap-1 mx-auto mt-2 mb-5 text-amber-300 hover:text-amber-50 rounded-lg text-xxs border border-amber-300 px-2 py-1 focus:outline-none ${ expandedCore !== core.account ? "relative top-[-10px]" : "" }`}
                onClick={() => toggleExpanded(core.account)}
              >
                SHOW {expandedCore === core.account ? "LESS" : "MORE"}
                <svg className={`w-2 h-2 transform transition-transform duration-200 ${ expandedCore === core.account ? "rotate-180" : "" }`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>

            <div className="flex w-full flex-col border border-neutral-50 rounded-md mb-1">
              <div className="flex items-center justify-between border-b border-neutral-50 py-2 px-3">
                <div className="text-xs">Total Stakers</div>
                <div className="flex flex-row">
                  {(coreInfo?.numberOfStakers || 0) >=
                    (chainProperties?.maxStakersPerCore || 0) ? (
                    <LockClosedIcon
                      className="h-5 w-5 cursor-pointer text-white"
                      onClick={() => {
                        toast.error(
                          "This core has reached the staker limit"
                        );
                      }}
                    />
                  ) : (
                    <UserGroupIcon
                      className="h-5 w-5 cursor-pointer text-white"
                      onClick={() => {
                        toast.success(
                          "This core can have more stakers"
                        );
                      }}
                    />
                  )}
                  <span className="ml-1 truncate text-sm font-bold">
                    {coreInfo?.numberOfStakers || "0"}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between border-b border-neutral-50 py-2 px-3">
                <span className="truncate text-xs">Total Staked</span>
                <span className="truncate text-sm font-bold">
                  {coreInfo?.total
                    ? formatBalance(coreInfo.total.toString(), {
                      decimals: 12,
                      withUnit: false,
                      forceUnit: "-",
                    }).slice(0, -2)
                    : "0"}{" "}
                  TNKR
                </span>
              </div>

              <div className="flex items-center justify-between py-2 px-3">
                <span className="text-xs">My Stake</span>
                <span className="text-sm font-bold">
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
                </span>
              </div>
            </div>
          </div>
        </div>

        {selectedAccount ? (
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              className="inline-flex w-full items-center justify-center rounded-md border border-amber-300 bg-amber-300 px-4 py-2 text-sm font-medium text-black shadow-sm hover:bg-amber-200 focus:outline-none focus:ring-2 focus:ring-neutral-500 focus:ring-offset-2 disabled:border-neutral-400 disabled:bg-neutral-400"
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
              }
            >
              Manage Staking
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default ProjectCard;