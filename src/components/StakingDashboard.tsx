import { BigNumber } from 'bignumber.js';
import { formatBalance } from '@polkadot/util';
import { UnclaimedErasType } from '../routes/staking';
import DashboardCard from './DashboardCard';

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
      className="relative overflow-x-auto w-full rounded-md border border-neutral-50 shadow flex gap-20 md:gap-16 justify-between backdrop-blur-sm p-4 tinker-scrollbar scrollbar scrollbar-thumb-amber-300 scrollbar-thin overflow-x-scroll">

      <DashboardCard cardTitle="My Stake">
        {formatBalance(totalUserStaked.toString(), {
          decimals: 12,
          withUnit: false,
          forceUnit: "-",
        }).slice(0, -2) || "0"}{" "}
        TNKR
      </DashboardCard>

      <DashboardCard cardTitle="Unredeemed Eras">
        {unclaimedEras.total}
      </DashboardCard>

      <DashboardCard cardTitle="Redeemed Rewards">
        {formatBalance(totalClaimed.toString(), {
          decimals: 12,
          withUnit: 'TNKR',
          forceUnit: "-",
        }).slice(0, -2) || "0"}{" "}
        TNKR
      </DashboardCard>

      <DashboardCard cardTitle="Staking APY">
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

      <DashboardCard cardTitle="Annual Rewards">
        {totalSupply && totalSupply.toNumber() > 0
          ? totalSupply
            .dividedBy(1000000000000)
            .times(0.06)
            .decimalPlaces(2)
            .toString()
          : 0}{" "}
        TNKR
      </DashboardCard>

      <DashboardCard cardTitle="Current Era">
        {currentStakingEra}
      </DashboardCard>

      <DashboardCard cardTitle="Completion Rate">
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