import { ApiPromise } from "@polkadot/api";
import { InjectedAccountWithMeta } from "@polkadot/extension-inject/types";
import BigNumber from "bignumber.js";
import { UnclaimedErasType } from "../routes/staking";
import { getSignAndSendCallbackWithPromise } from "./getSignAndSendCallback";
import { Vec } from "@polkadot/types";
import { Balance, Call } from "@polkadot/types/interfaces";
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
  handleRestakingLogic: (partialFee?: Balance | undefined, stakedDaos?: number) => void | BigNumber;
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
        const restakeUnclaimedAmount = handleRestakingLogic(undefined, uniqueCores.length);
        if (restakeUnclaimedAmount && !restakeUnclaimedAmount.isZero()) {
          const restakeAmountInteger = restakeUnclaimedAmount.integerValue().toString();
          batch.push(api.tx.ocifStaking.stake(core.coreId, restakeAmountInteger));
        }
      });
    }

    if (batch.length === 0) {
      setWaiting(false);
      toast.dismiss();
      toast.error("No transactions to send");
      throw new Error("No transactions to send");
    };

    // Get the fee that the entire batch transaction will cost
    const info = await api.tx.utility.batchAll(batch as Vec<Call>).paymentInfo(selectedAccount.address, { signer: injector.signer });
    const batchTxFees: Balance = info.partialFee;

    // Rebuild the batch exactly like we did before,
    const rebuildBatch: unknown[] = [];
    uniqueCores.forEach(core => {
      if (!core?.earliestEra) return;
      for (let i = core.earliestEra; i < currentStakingEra; i++) {
        rebuildBatch.push(api.tx.ocifStaking.stakerClaimRewards(core.coreId));
      }
    });

    // But this time, use the adjusted restakeUnclaimedAmount (minus fees)
    if (enableAutoRestake) {
      uniqueCores.forEach(core => {
        if (!core?.earliestEra) return;
        const restakeUnclaimedAmount = handleRestakingLogic(batchTxFees, uniqueCores.length);
        if (restakeUnclaimedAmount && restakeUnclaimedAmount.isGreaterThan(0)) {
          const restakeAmountInteger = restakeUnclaimedAmount.integerValue().toString();
          rebuildBatch.push(api.tx.ocifStaking.stake(core.coreId, restakeAmountInteger));
        } else {
          toast.dismiss();
          toast.error("The batch transaction fee is greater than the unclaimed rewards.");
          throw new Error("The batch transaction fee is greater than the unclaimed rewards.");
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
          result = false;
          return false;
        },
        onExecuted: () => {
          toast.dismiss();
          toast.loading("Waiting for confirmation...");
          setWaiting(true);
          return false;
        },
        onSuccess: () => {
          toast.dismiss();
          toast.success("Claimed successfully");
          setWaiting(false);
          result = true;
          return true;
        },
        onDropped: () => {
          toast.dismiss();
          toast.error("Transaction dropped");
          setWaiting(false);
          result = false;
          return false;
        },
      })
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