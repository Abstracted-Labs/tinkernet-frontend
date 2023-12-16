import { ApiPromise } from "@polkadot/api";
import { CorePrimitiveType, StakingCore, TotalUserStakedData } from "../routes/staking";
import BigNumber from "bignumber.js";
import { StakedDaoType } from "../routes/overview";

export const loadStakedDaos = async (stakingCores: StakingCore[], selectedAccount: string, totalUserStakedData: TotalUserStakedData, api: ApiPromise) => {
  if (!stakingCores || stakingCores.length === 0 || !selectedAccount) return [];

  const daos: StakedDaoType[] = await Promise.all(stakingCores.map(async (core) => {
    const userStaked = totalUserStakedData[core.key];
    if (userStaked && userStaked.isGreaterThan(new BigNumber(1))) {
      const members = await api.query.inv4.coreMembers.entries(core.key);
      const mems = members.map(([key]) => key.args.map((arg) => arg.toHuman())[1]);
      return { ...core, members: mems };
    }
    return null;
  })).then(results => results.filter(result => result !== null) as StakedDaoType[]);

  return daos;
};

export async function loadProjectCores(
  api: ApiPromise,
): Promise<Array<{ key: number; } & CorePrimitiveType> | undefined> {
  try {
    const stakingCores = (
      await api.query.ocifStaking.registeredCore.entries()
    ).map(
      ([
        {
          args: [key],
        },
        core,
      ]) => {
        const c = core.toPrimitive() as CorePrimitiveType;

        const primitiveKey = key.toPrimitive() as number;

        return {
          key: primitiveKey,
          ...c,
        };
      }
    );

    return stakingCores;
  } catch (error) {
    console.log(error);
  }
}