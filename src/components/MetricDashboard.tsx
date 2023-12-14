import { BigNumber } from 'bignumber.js';
import { formatBalance } from '@polkadot/util';
import { UnclaimedErasType } from '../routes/staking';
import DashboardCard from './DashboardCard';
import MyStakeIcon from '../assets/my-stake-icon.svg';
import UnclaimedErasIcon from '../assets/unclaimed-era-icon.svg';
import ClaimableRewardsIcon from '../assets/claimable-reward-icon.svg';
import StakingApyIcon from '../assets/staking-apy-icon.svg';
import AnnualRewardIcon from '../assets/annual-reward-icon.svg';
import CurrentEraIcon from '../assets/current-era-icon.svg';
import CompletionRateIcon from '../assets/completion-rate-icon.svg';
import AggregateStakedIcon from '../assets/aggregate-staked-icon.svg';

interface MetricDashboardProps {
  aggregateStaked: BigNumber | undefined; // Required for total TNKR supply staked
  totalUserStaked: BigNumber | undefined; // Required for my total stake
  totalSupply: BigNumber | undefined; // Required for projected annual DAO rewards
  totalStaked: BigNumber | undefined; // Required for my total stake
  unclaimedEras: UnclaimedErasType | undefined;
  totalClaimed: BigNumber | undefined;
  currentStakingEra: number | undefined;
  currentBlock: number | undefined;
  nextEraBlock: number | undefined;
  blocksPerEra: number | undefined;
}

const MetricDashboard = (props: MetricDashboardProps) => {
  const {
    aggregateStaked,
    totalUserStaked,
    totalSupply,
    unclaimedEras,
    totalClaimed,
    totalStaked,
    currentStakingEra,
    currentBlock,
    nextEraBlock,
    blocksPerEra,
  } = props;

  return (
    <div
      className="relative overflow-x-auto w-full rounded-xl shadow flex flex-row gap-4 justify-between backdrop-blur-sm bg-black bg-opacity-40 tinker-scrollbar scrollbar scrollbar-thumb-amber-300 scrollbar-thin overflow-x-auto p-4 mb-4">

      {totalUserStaked !== undefined && <DashboardCard cardTitle="My Staked TNKR" iconSrc={MyStakeIcon}>
        {formatBalance(totalUserStaked.toString(), {
          decimals: 12,
          withUnit: 'TNKR',
          forceUnit: "-",
        }) || "0 TNKR"}
      </DashboardCard>}

      {totalSupply !== undefined && totalStaked !== undefined && <DashboardCard cardTitle="Individual Staking APY" iconSrc={StakingApyIcon}>
        {totalSupply &&
          totalSupply.toNumber() > 0 &&
          totalStaked &&
          totalStaked.toNumber() > 0
          ? totalSupply
            .times(4) // 4 eras per year
            .dividedBy(totalStaked) // Total supply / total staked
            .decimalPlaces(2)
            .toString()
          : 0}
        %
      </DashboardCard>}

      {aggregateStaked !== undefined && <DashboardCard
        cardTitle="Total TNKR Supply"
        iconSrc={AggregateStakedIcon}
        leading="leading-tight"
      >
        {formatBalance(aggregateStaked.toString(), {
          decimals: 12,
          withUnit: false,
          forceUnit: "-",
        }) || "0"}
      </DashboardCard>}

      {aggregateStaked !== undefined && totalStaked !== undefined && <DashboardCard
        cardTitle="Staked TNKR of Total Supply"
        iconSrc={AggregateStakedIcon}
        leading="leading-tight"
      >
        {totalStaked && totalStaked.toNumber() > 0 && aggregateStaked && aggregateStaked.toNumber() > 0 ? totalStaked.dividedBy(aggregateStaked).times(100).toFixed(2) : 0}%
      </DashboardCard>}

      {totalSupply !== undefined && <DashboardCard cardTitle="Projected Annual DAO Rewards" iconSrc={AnnualRewardIcon}>
        {totalSupply && totalSupply.toNumber() > 0
          ? formatBalance(
            totalSupply
              .dividedBy(1000000000000)
              .times(0.06)
              .times(10 ** 12) // Convert to smallest unit
              .integerValue() // Ensure it's an integer
              .toFixed(),
            {
              decimals: 12,
              withUnit: 'TNKR',
              forceUnit: '-',
            }
          )
          : '0 TNKR'}
      </DashboardCard>}

      {totalClaimed !== undefined && <DashboardCard cardTitle="Redeemed Rewards" iconSrc={ClaimableRewardsIcon}>
        {totalClaimed ? formatBalance(totalClaimed.toString(), {
          decimals: 12,
          withUnit: 'TNKR',
          forceUnit: "-",
        }) : "0"}
      </DashboardCard>}

      {unclaimedEras !== undefined && <DashboardCard cardTitle="Unredeemed Eras" iconSrc={UnclaimedErasIcon}>
        {unclaimedEras ? unclaimedEras.total : 0}
      </DashboardCard>}

      {currentStakingEra !== undefined && <DashboardCard cardTitle="Current Era" iconSrc={CurrentEraIcon}>
        {currentStakingEra || 0}
      </DashboardCard>}

      {currentBlock !== undefined && nextEraBlock !== undefined && blocksPerEra !== undefined && <DashboardCard cardTitle="% Til Next Era" iconSrc={CompletionRateIcon}>
        {currentBlock && nextEraBlock && blocksPerEra ? (
          ((currentBlock - (nextEraBlock - blocksPerEra)) /
            (nextEraBlock - (nextEraBlock - blocksPerEra))) *
          100
        ).toFixed(0) : 0}
        %
      </DashboardCard>}
    </div>
  );
};

export default MetricDashboard;