import { ApiPromise } from "@polkadot/api";
import { InjectedAccountWithMeta } from "@polkadot/extension-inject/types";
import BigNumber from "bignumber.js";
import { UnclaimedErasType, UserStakedInfoType } from "../routes/staking";
import { Vec } from "@polkadot/types";
import { Balance, Call } from "@polkadot/types/interfaces";
import toast from "react-hot-toast";
import { web3Enable, web3FromAddress } from "@polkadot/extension-dapp";
import { getSignAndSendCallbackWithPromise } from "./getSignAndSendCallback";

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
  currentStakingEra,
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
      toast.error("Can only claim when unclaimed TNKR is greater than the existential deposit");
      throw new Error("Can only claim when unclaimed TNKR is greater than the existential deposit");
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

    // Create claim transactions
    uniqueCores.forEach(core => {
      if (!core?.earliestEra) return;
      for (let i = core.earliestEra; i < currentStakingEra; i++) {
        batch.push(api.tx.ocifStaking.stakerClaimRewards(core.coreId));
      }
    });

    // Optionally create restake transactions
    if (enableAutoRestake) {
      coresWithStake.forEach(core => {
        if (!core?.earliestEra) return;
        const restakeUnclaimedAmount = handleRestakingLogic(undefined, coresWithStake.length);
        if (restakeUnclaimedAmount && restakeUnclaimedAmount.isGreaterThan(0)) {
          const restakeAmountInteger = restakeUnclaimedAmount.integerValue().toString();
          console.log(`Restaking ${ restakeAmountInteger } TNKR for core ID: ${ core.coreId }`);
          batch.push(api.tx.ocifStaking.stake(core.coreId, restakeAmountInteger));
        }
      });
    }

    if (batch.length === 0) {
      const message = "Please wait until the next era to claim rewards.";
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
    uniqueCores.forEach(core => {
      if (!core?.earliestEra) return;
      for (let i = core.earliestEra; i < currentStakingEra; i++) {
        rebuildBatch.push(api.tx.ocifStaking.stakerClaimRewards(core.coreId));
      }
    });

    // Adjust the restake logic to account for transaction fees
    if (enableAutoRestake) {
      coresWithStake.forEach(core => {
        if (!core?.earliestEra) return;
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
      getSignAndSendCallbackWithPromise({
        onInvalid: () => {
          toast.dismiss();
          toast.error("Invalid transaction");
          setWaiting(false);
          result = false;
        },
        onExecuted: () => {
          toast.dismiss();
          toast.loading("Waiting for confirmation...");
          setWaiting(true);
        },
        onSuccess: () => {
          toast.dismiss();
          toast.success("Claimed successfully");
          setWaiting(false);
          result = true;
        },
        onDropped: () => {
          toast.dismiss();
          toast.error("Transaction dropped");
          setWaiting(false);
          result = false;
        },
        onError: (error) => {
          toast.dismiss();
          toast.error(error);
          setWaiting(false);
          result = false;
        }
      }, api)
    );

    toast.dismiss();
  } catch (error) {
    toast.dismiss();
    toast.error(`${ error }`);
    console.error(error);
    setWaiting(false);
  }

  return result;
};