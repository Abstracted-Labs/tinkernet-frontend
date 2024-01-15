import { BigNumber } from 'bignumber.js';
import { UnclaimedErasType } from '../routes/staking';
import DashboardCard from './DashboardCard';
import MyStakeIcon from '../assets/my-stake-icon.svg';
import UnclaimedErasIcon from '../assets/unclaimed-era-icon.svg';
import ClaimableRewardsIcon from '../assets/claimable-reward-icon.svg';
import StakingApyIcon from '../assets/staking-apy-icon.svg';
import AnnualRewardIcon from '../assets/annual-reward-icon.svg';
import CurrentEraIcon from '../assets/current-era-icon.svg';
import AggregateStakedIcon from '../assets/aggregate-staked-icon.svg';
import { formatBalanceToTwoDecimals } from '../utils/formatNumber';
import { useState, useEffect } from 'react';

interface MetricDashboardProps {
  vestingBalance: string | undefined;
  availableBalance: BigNumber | undefined;
  lockedBalance: BigNumber | undefined;
  aggregateStaked: BigNumber | undefined; // Required for total TNKR supply staked
  totalUserStaked: BigNumber | undefined; // Required for my total stake
  totalSupply: BigNumber | undefined; // Required for projected annual DAO rewards
  totalStaked: BigNumber | undefined; // Required for my total stake
  unclaimedEras: UnclaimedErasType | undefined;
  totalUnclaimed: BigNumber | undefined;
  totalClaimed: BigNumber | undefined;
  currentStakingEra: number | undefined;
  currentBlock: number | undefined;
  nextEraBlock: number | undefined;
  blocksPerEra: number | undefined;
  isOverview: boolean;
}

const MetricDashboard = (props: MetricDashboardProps) => {
  const [mini, setMini] = useState(false);
  const {
    vestingBalance,
    availableBalance,
    lockedBalance,
    aggregateStaked,
    totalUserStaked,
    totalSupply,
    unclaimedEras,
    totalUnclaimed,
    totalClaimed,
    totalStaked,
    currentStakingEra,
    currentBlock,
    nextEraBlock,
    blocksPerEra,
    isOverview
  } = props;

  useEffect(() => {
    const setMiniOnSmallScreen = () => {
      if (!isOverview && window.innerWidth > 1024) {
        setMini(true);
      }
    };
    setMiniOnSmallScreen();
  }, [isOverview]);

  return (
    <div
      className="min-h-40 max-w-[1068px] relative overflow-x-auto rounded-xl shadow flex lg:flex-wrap flex-grow flex-row gap-4 justify-between backdrop-blur-sm bg-black bg-opacity-40 tinker-scrollbar scrollbar scrollbar-thumb-amber-300 scrollbar-thin overflow-x-auto p-4 mb-4">

      {totalUnclaimed !== undefined && <DashboardCard cardTitle="Unclaimed Rewards" iconSrc={AggregateStakedIcon}>
        {totalUnclaimed ? `${ formatBalanceToTwoDecimals(totalUnclaimed) } TNKR` : "0 TNKR"}
      </DashboardCard>}

      {unclaimedEras !== undefined && <DashboardCard cardTitle="Unclaimed Eras" iconSrc={UnclaimedErasIcon}>
        {unclaimedEras ? unclaimedEras.total : 0}
      </DashboardCard>}

      {currentStakingEra !== undefined && <DashboardCard cardTitle={<>Current Era <br /> ({(currentBlock ?? 0) && (nextEraBlock ?? 0) && (blocksPerEra ?? 0) ? (
        (((currentBlock ?? 0) - ((nextEraBlock ?? 0) - (blocksPerEra ?? 0))) /
          ((nextEraBlock ?? 0) - ((nextEraBlock ?? 0) - (blocksPerEra ?? 0)))) *
        100
      ).toFixed(0) : 0}% until next era)</>} iconSrc={CurrentEraIcon}>
        {currentStakingEra || 0}
      </DashboardCard>}

      {totalClaimed !== undefined && <DashboardCard cardTitle="Claimed Rewards" iconSrc={ClaimableRewardsIcon}>
        {totalClaimed ? `${ formatBalanceToTwoDecimals(totalClaimed) } TNKR` : "0 TNKR"}
      </DashboardCard>}

      {availableBalance !== undefined && <DashboardCard cardTitle="Available Balance" iconSrc={AggregateStakedIcon}>
        {availableBalance ? `${ formatBalanceToTwoDecimals(availableBalance) } TNKR` : "0 TNKR"}
      </DashboardCard>}

      {totalUserStaked !== undefined && vestingBalance === undefined && <DashboardCard
        cardTitle="My Staked TNKR" iconSrc={MyStakeIcon}>
        {
          totalUserStaked
            ? formatBalanceToTwoDecimals(
              new BigNumber(totalUserStaked).isNaN()
                ? new BigNumber(0)
                : totalUserStaked
            ) + ' TNKR'
            : '0 TNKR'
        }
      </DashboardCard>}

      {lockedBalance && <DashboardCard cardTitle="My Staked + Vesting TNKR" iconSrc={MyStakeIcon}>
        {
          lockedBalance
            ? lockedBalance.isNaN()
              ? '0 TNKR'
              : formatBalanceToTwoDecimals(lockedBalance) + ' TNKR'
            : '0 TNKR'
        }
      </DashboardCard>}

      {totalSupply !== undefined && totalStaked !== undefined && <DashboardCard
        mini={mini}
        cardTitle="Staking APY" iconSrc={StakingApyIcon}>
        {totalSupply &&
          totalSupply.toNumber() > 0 &&
          totalStaked &&
          totalStaked.toNumber() > 0
          ? totalSupply
            .times(4) // Annualize
            .dividedBy(totalStaked) // Total supply / total staked
            .decimalPlaces(2)
            .toString()
          : 0}
        %
      </DashboardCard>}

      {totalSupply !== undefined && <DashboardCard
        mini={mini}
        cardTitle="Projected Annual DAO Rewards" iconSrc={AnnualRewardIcon}>
        {totalSupply && totalSupply.toNumber() > 0
          ? `${ formatBalanceToTwoDecimals(
            totalSupply
              .dividedBy(1000000000000)
              .times(0.06)
              .times(10 ** 12) // Convert to smallest unit
              .integerValue() // Ensure it's an integer
          ) } TNKR`
          : '0 TNKR'}
      </DashboardCard>}

      {aggregateStaked !== undefined && totalStaked !== undefined && <DashboardCard
        mini={mini}
        cardTitle="Total TNKR Staked (%)"
        iconSrc={AggregateStakedIcon}
        leading="leading-tight"
      >
        {totalStaked && totalStaked.toNumber() > 0 && aggregateStaked && aggregateStaked.toNumber() > 0 ? totalStaked.times(100).dividedBy(aggregateStaked).toFixed(2) : 0}%
      </DashboardCard>}

      {totalSupply !== undefined && <DashboardCard
        mini={mini}
        cardTitle="Total TNKR Supply"
        iconSrc={AggregateStakedIcon}
        leading="leading-tight"
      >
        {totalSupply ? `${ formatBalanceToTwoDecimals(totalSupply) } TNKR` : "0 TNKR"}
      </DashboardCard>}
    </div>
  );
};

export default MetricDashboard;
