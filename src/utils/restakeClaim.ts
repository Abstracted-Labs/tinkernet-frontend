import { ApiPromise } from "@polkadot/api";
import { InjectedAccountWithMeta } from "@polkadot/extension-inject/types";
import BigNumber from "bignumber.js";
import { UnclaimedErasType } from "../routes/staking";
import { getSignAndSendCallbackWithPromise } from "./getSignAndSendCallback";
import { Vec } from "@polkadot/types";
import { Call } from "@polkadot/types/interfaces";
import toast from "react-hot-toast";
import { web3Enable, web3FromAddress } from "@polkadot/extension-dapp";

export interface RestakeClaimProps {
  selectedAccount: InjectedAccountWithMeta;
  unclaimedEras: UnclaimedErasType;
  currentStakingEra: number;
  api: ApiPromise;
  setWaiting: (isWaiting: boolean) => void;
  disableClaiming: boolean;
  enableAutoRestake: boolean;
  handleRestakingLogic: () => void | BigNumber;
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
}: RestakeClaimProps) => {
  try {
    toast.loading("Claiming...");

    if (disableClaiming) {
      toast.dismiss();
      toast.error("Can only claim when unclaimed TNKR is greater than the existential deposit");
      return;
    }

    await web3Enable("Tinkernet");

    const injector = await web3FromAddress(selectedAccount.address);
    const uniqueCores = [...new Map(unclaimedEras.cores.map((x) => [x['coreId'], x])).values()];
    const batch: unknown[] = [];

    // Create claim transactions
    uniqueCores.forEach(core => {
      if (!core?.earliestEra) return;
      for (let i = core.earliestEra; i < currentStakingEra; i++) {
        batch.push(api.tx.ocifStaking.stakerClaimRewards(core.coreId));
      }
    });

    // Optionally create restake transactions
    if (enableAutoRestake) {
      uniqueCores.forEach(core => {
        if (!core?.earliestEra) return;
        const restakeAmount = handleRestakingLogic();
        if (restakeAmount && !restakeAmount.isZero()) {
          const restakeAmountInteger = restakeAmount.integerValue().toString();
          batch.push(api.tx.ocifStaking.stake(core.coreId, restakeAmountInteger));
        }
      });
    }

    if (batch.length === 0) return;

    // Get the fee that each batch transaction will cost
    const info = await api.tx.utility.batchAll(batch as Vec<Call>).paymentInfo(selectedAccount.address, { signer: injector.signer });
    const batchTxFees = info.partialFee;
    const rebuildBatch: unknown[] = [];

    // Rebuild the batch exactly like we did before,
    uniqueCores.forEach(core => {
      if (!core?.earliestEra) return;
      for (let i = core.earliestEra; i < currentStakingEra; i++) {
        rebuildBatch.push(api.tx.ocifStaking.stakerClaimRewards(core.coreId));
      }
    });

    // But now, using adjustedRestakeAmount in the stake call(s)
    if (enableAutoRestake) {
      uniqueCores.forEach(core => {
        if (!core?.earliestEra) return;
        const restakeAmount = handleRestakingLogic();
        if (restakeAmount && !restakeAmount.isZero()) {
          const batchTxFeesBigNumber = new BigNumber(batchTxFees.toString());
          let adjustedRestakeAmount = restakeAmount.minus(batchTxFeesBigNumber).minus(new BigNumber(0.01));
          if (adjustedRestakeAmount.isNegative()) {
            adjustedRestakeAmount = new BigNumber(0);
          }
          const adjustedRestakeAmountInteger = adjustedRestakeAmount.integerValue().toString();
          rebuildBatch.push(api.tx.ocifStaking.stake(core.coreId, adjustedRestakeAmountInteger));
        }
      });
    }

    // Send the transaction batch
    // Casting batch to the correct type to satisfy the linting error
    const castedBatch = rebuildBatch as Vec<Call>;
    await api.tx.utility.batchAll(castedBatch).signAndSend(
      selectedAccount.address,
      { signer: injector.signer },
      getSignAndSendCallbackWithPromise({
        onInvalid: () => {
          toast.dismiss();
          toast.error("Invalid transaction");
          setWaiting(false);
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
        },
        onDropped: () => {
          toast.dismiss();
          toast.error("Transaction dropped");
          setWaiting(false);
        },
      })
    );

    toast.dismiss();
  } catch (error) {
    toast.dismiss();
    toast.error(`${ error }`);
    console.error(error);
  }
};