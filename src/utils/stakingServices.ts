import { ApiPromise } from "@polkadot/api";
import { DaoPrimitiveType, StakingDao } from "../routes/staking";
import { StakedDaoType } from "../routes/overview";

export const loadStakedDaos = async (stakingDaos: StakingDao[], selectedAccount: string, api: ApiPromise) => {
  if (!stakingDaos || stakingDaos.length === 0 || !selectedAccount) return [];

  const daos: StakedDaoType[] = await Promise.all(stakingDaos.map(async (core) => {
    const members = await api.query.inv4.coreMembers.entries(core.key);
    const mems = members.map(([key]) => key.args.map((arg) => arg.toHuman())[1]);
    return { ...core, members: mems };
  })).then(results => results.filter(result => result !== null) as StakedDaoType[]);

  return daos;
};

export async function loadProjectDaos(
  api: ApiPromise,
): Promise<Array<{ key: number; } & DaoPrimitiveType> | undefined> {
  try {
    const stakingDaos = (
      await api.query.ocifStaking.registeredCore.entries()
    ).map(
      ([
        {
          args: [key],
        },
        core,
      ]) => {
        const c = core.toPrimitive() as DaoPrimitiveType;

        const primitiveKey = key.toPrimitive() as number;

        return {
          key: primitiveKey,
          ...c,
        };
      }
    );

    return stakingDaos;
  } catch (error) {
    console.log(error);
  }
}