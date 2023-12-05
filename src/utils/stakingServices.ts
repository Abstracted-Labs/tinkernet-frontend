import { ApiPromise } from "@polkadot/api";
import { CorePrimitiveType } from "../routes/staking";

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