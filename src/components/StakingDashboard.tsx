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

interface StakingDashboardProps {
  totalUserStaked: BigNumber;
  unclaimedEras: UnclaimedErasType;
  totalClaimed: BigNumber;
  totalSupply: BigNumber;
  totalStaked: BigNumber;
  aggregateStaked: BigNumber;
  currentStakingEra: number;
  currentBlock: number;
  nextEraBlock: number;
  blocksPerEra: number;
}

const StakingDashboard = (props: StakingDashboardProps) => {
  const {
    totalUserStaked,
    unclaimedEras,
    totalClaimed,
    totalSupply,
    totalStaked,
    aggregateStaked,
    currentStakingEra,
    currentBlock,
    nextEraBlock,
    blocksPerEra,
  } = props;

  return (
    <div
      className="relative overflow-x-auto w-full rounded-lg shadow flex flex-row gap-4 justify-between backdrop-blur-sm bg-black bg-opacity-40 tinker-scrollbar scrollbar scrollbar-thumb-amber-300 scrollbar-thin overflow-x-auto p-4">

      <DashboardCard cardTitle="My Total Stake" iconSrc={MyStakeIcon}>
        {formatBalance(totalUserStaked.toString(), {
          decimals: 12,
          withUnit: 'TNKR',
          forceUnit: "-",
        }) || "0 TNKR"}
      </DashboardCard>

      <DashboardCard
        cardTitle={
          <>
            {"Staked TNKR of"}
            <br />
            {formatBalance(aggregateStaked.toString(), {
              decimals: 12,
              withUnit: false,
              forceUnit: "-",
            }) || "0"}
            <br />
            {"Total Supply"}
          </>
        }
        iconSrc={AggregateStakedIcon}
        leading="leading-tight"
      >
        {totalStaked && totalStaked.toNumber() > 0 && aggregateStaked && aggregateStaked.toNumber() > 0 ? totalStaked.dividedBy(aggregateStaked).times(100).toFixed(2) : 0}%
      </DashboardCard>

      <DashboardCard cardTitle="Staking APY" iconSrc={StakingApyIcon}>
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
      </DashboardCard>

      <DashboardCard cardTitle="Annual DAO Rewards" iconSrc={AnnualRewardIcon}>
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
      </DashboardCard>

      <DashboardCard cardTitle="Redeemed Rewards" iconSrc={ClaimableRewardsIcon}>
        {formatBalance(totalClaimed.toString(), {
          decimals: 12,
          withUnit: 'TNKR',
          forceUnit: "-",
        }) || "0"}
      </DashboardCard>

      <DashboardCard cardTitle="Unredeemed Eras" iconSrc={UnclaimedErasIcon}>
        {unclaimedEras.total}
      </DashboardCard>

      <DashboardCard cardTitle="Current Era" iconSrc={CurrentEraIcon}>
        {currentStakingEra}
      </DashboardCard>

      <DashboardCard cardTitle="% Til Next Era" iconSrc={CompletionRateIcon}>
        {(
          ((currentBlock - (nextEraBlock - blocksPerEra)) /
            (nextEraBlock - (nextEraBlock - blocksPerEra))) *
          100
        ).toFixed(0)}
        %
      </DashboardCard>
    </div>
  );
};

export default StakingDashboard;