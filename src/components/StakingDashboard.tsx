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

interface StakingDashboardProps {
  totalUserStaked: BigNumber;
  unclaimedEras: UnclaimedErasType;
  totalClaimed: BigNumber;
  totalSupply: BigNumber;
  totalStaked: BigNumber;
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
    currentStakingEra,
    currentBlock,
    nextEraBlock,
    blocksPerEra,
  } = props;
  return (
    <div
      className="relative overflow-x-auto w-full rounded-lg shadow flex flex-row gap-4 justify-between backdrop-blur-sm bg-black bg-opacity-40 tinker-scrollbar scrollbar scrollbar-thumb-amber-300 scrollbar-thin overflow-x-auto p-4">

      <DashboardCard cardTitle="My Stake" iconSrc={MyStakeIcon}>
        {formatBalance(totalUserStaked.toString(), {
          decimals: 12,
          withUnit: false,
          forceUnit: "-",
        }).slice(0, -2) || "0"}{" "}
        TNKR
      </DashboardCard>

      <DashboardCard cardTitle="Unredeemed Eras" iconSrc={UnclaimedErasIcon}>
        {unclaimedEras.total}
      </DashboardCard>

      <DashboardCard cardTitle="Redeemed Rewards" iconSrc={ClaimableRewardsIcon}>
        {formatBalance(totalClaimed.toString(), {
          decimals: 12,
          withUnit: 'TNKR',
          forceUnit: "-",
        }).slice(0, -2) || "0"}{" "}
        TNKR
      </DashboardCard>

      <DashboardCard cardTitle="Staking APY" iconSrc={StakingApyIcon}>
        {totalSupply &&
          totalSupply.toNumber() > 0 &&
          totalStaked &&
          totalStaked.toNumber() > 0
          ? totalSupply
            .times(4)
            .dividedBy(totalStaked)
            .decimalPlaces(2)
            .toString()
          : 0}
        %
      </DashboardCard>

      <DashboardCard cardTitle="Annual DAO Rewards" iconSrc={AnnualRewardIcon}>
        {totalSupply && totalSupply.toNumber() > 0
          ? totalSupply
            .dividedBy(1000000000000)
            .times(0.06)
            .decimalPlaces(2)
            .toString()
          : 0}{" "}
        TNKR
      </DashboardCard>

      <DashboardCard cardTitle="Current Era" iconSrc={CurrentEraIcon}>
        {currentStakingEra}
      </DashboardCard>

      <DashboardCard cardTitle="Completion Rate" iconSrc={CompletionRateIcon}>
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