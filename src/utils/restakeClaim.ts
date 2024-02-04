import { ApiPromise } from "@polkadot/api";
import { InjectedAccountWithMeta } from "@polkadot/extension-inject/types";
import BigNumber from "bignumber.js";
import { UnclaimedErasType, UserStakedInfoType } from "../routes/staking";
import { Vec } from "@polkadot/types";
import { Balance, Call } from "@polkadot/types/interfaces";
import toast from "react-hot-toast";
import { web3Enable, web3FromAddress } from "@polkadot/extension-dapp";
import { RegistryError } from "@polkadot/types/types";

export interface RestakeClaimProps {
  selectedAccount: InjectedAccountWithMeta;
  unclaimedEras: UnclaimedErasType;
  currentStakingEra: number;
  api: ApiPromise;
  setWaiting: (isWaiting: boolean) => void;
  disableClaiming: boolean;
  enableAutoRestake: boolean;
  handleRestakingLogic: (partialFee?: Balance | undefined, stakedDaos?: number) => void | BigNumber;
  userStakedInfoMap: Map<number, UserStakedInfoType>;
}

export const restakeClaim = async ({
  selectedAccount,
  unclaimedEras,
  // currentStakingEra,
  api,
  setWaiting,
  disableClaiming,
  enableAutoRestake,
  handleRestakingLogic,
  userStakedInfoMap,
}: RestakeClaimProps): Promise<boolean> => {
  let result = false;

  try {
    setWaiting(true);
    toast.loading("Claiming...");

    if (disableClaiming) {
      setWaiting(false);
      toast.dismiss();
      toast.error("Can only claim when unclaimed VARCH is greater than the existential deposit");
      throw new Error("Can only claim when unclaimed VARCH is greater than the existential deposit");
    }

    await web3Enable('Tinkernet');

    const injector = await web3FromAddress(selectedAccount.address);
    const uniqueCores = [...new Map(unclaimedEras.cores.map((x) => [x['coreId'], x])).values()];
    const batch: unknown[] = [];

    // Filter uniqueCores to include only those with non-zero stake
    const coresWithStake = uniqueCores.filter(core => {
      const userStakeInfo = userStakedInfoMap.get(core.coreId);
      const hasStake = userStakeInfo && userStakeInfo.staked.isGreaterThan(0);
      return hasStake;
    });

    // Create claim transactions for cores where the user has a stake
    coresWithStake.forEach(core => {
      batch.push(api.tx.ocifStaking.stakerClaimRewards(core.coreId));
    });

    // Optionally create restake transactions
    if (enableAutoRestake) {
      coresWithStake.forEach(core => {
        const restakeUnclaimedAmount = handleRestakingLogic(undefined, coresWithStake.length);
        if (restakeUnclaimedAmount && restakeUnclaimedAmount.isGreaterThan(0)) {
          const restakeAmountInteger = restakeUnclaimedAmount.integerValue().toString();
          console.log(`Restaking ${ restakeAmountInteger } VARCH for core ID: ${ core.coreId }`);
          batch.push(api.tx.ocifStaking.stake(core.coreId, restakeAmountInteger));
        }
      });
    }

    if (batch.length === 0) {
      const message = "No transactions to send";
      setWaiting(false);
      toast.dismiss();
      toast.error(message);
      throw new Error(message);
    };

    // Calculate the transaction fees for the initial batch
    // TODO: Proper solution is to still use batchAll but not attempt to claim eras where stake == 0
    const info = await api.tx.utility.batch(batch as Vec<Call>).paymentInfo(selectedAccount.address, { signer: injector.signer });
    const batchTxFees: Balance = info.partialFee;
    const rebuildBatch: unknown[] = [];

    // Rebuild the batch with only the cores where the user has a non-zero stake
    coresWithStake.forEach(core => {
      rebuildBatch.push(api.tx.ocifStaking.stakerClaimRewards(core.coreId));
    });

    // Adjust the restake logic to account for transaction fees
    if (enableAutoRestake) {
      coresWithStake.forEach(core => {
        const restakeUnclaimedAmount = handleRestakingLogic(batchTxFees, coresWithStake.length);
        if (restakeUnclaimedAmount && restakeUnclaimedAmount.isGreaterThan(new BigNumber(batchTxFees.toString()))) {
          // Ensure the restake amount is adjusted for the transaction fees
          const adjustedRestakeAmount = restakeUnclaimedAmount.minus(new BigNumber(batchTxFees.toString()));
          if (adjustedRestakeAmount.isGreaterThan(0)) { // Check if there's a non-zero amount to stake
            const restakeAmountInteger = adjustedRestakeAmount.integerValue().toString();
            rebuildBatch.push(api.tx.ocifStaking.stake(core.coreId, restakeAmountInteger));
          } else {
            console.log(`Skipping core ID: ${ core.coreId } due to zero adjusted restake amount.`);
          }
        } else {
          console.log(`Skipping core ID: ${ core.coreId } due to insufficient unclaimed rewards to cover transaction fees.`);
        }
      });
    }

    // Send the transaction batch
    // Casting batch to the correct type to satisfy the linting error
    const castedBatch = rebuildBatch as Vec<Call>;

    // TODO: Proper solution is to still use batchAll but not attempt to claim eras where stake == 0
    await api.tx.utility.batch(castedBatch).signAndSend(
      selectedAccount.address,
      { signer: injector.signer },
      ({ status, events, dispatchError }) => {
        if (status.isInBlock || status.isFinalized) {
          let batchInterruptedHandled = false; // Flag to track if BatchInterrupted has been handled
          events.forEach(({ event: { data, method, section } }) => {
            if (method === 'BatchInterrupted' && !batchInterruptedHandled) {
              batchInterruptedHandled = true; // Set the flag to true to prevent handling again
              data.forEach((d) => {
                const moduleError = d as unknown as { isModule: boolean; asModule: { index: number, error: number; }; };
                if (moduleError.isModule) {
                  const { index, error } = moduleError.asModule;
                  const decoded = api.registry.findMetaError(new Uint8Array([index, error]));
                  const message = `${ section }.${ method } at [${ decoded.index }]: ${ decoded.name }`;
                  toast.dismiss();
                  toast.error(message);
                  setWaiting(false);
                  throw new Error(message);
                }
              });
            }
          });

          if (dispatchError) {
            if (dispatchError.isModule) {
              // for module errors, we have the section indexed, lookup
              const decoded: RegistryError = api.registry.findMetaError(dispatchError.asModule);
              const { docs, method, section, index } = decoded; decoded;
              const message = `${ section }.${ method }: ${ docs.join(' ') } (${ index })`;
              console.error(message);
              toast.error(message);
            } else {
              // Other, CannotLookup, BadOrigin, no extra info
              console.error(dispatchError.toString());
              toast.error(dispatchError.toString());
            }
            setWaiting(false);
            result = false;
          } else {
            // Check for specific success events if necessary
            const isSuccess = events.some(({ event }) => api.events.system.ExtrinsicSuccess.is(event));

            if (isSuccess) {
              toast.dismiss();
              toast.success("Claimed successfully");
            } else {
              toast.error("Transaction did not succeed");
            }
            setWaiting(false);
            result = isSuccess;
          }
        }
      }
    );

    toast.dismiss();
  } catch (error) {
    toast.dismiss();
    toast.error(`${ error }`);
    console.error(error);
    setWaiting(false);
    result = false;
  }

  return result;
};