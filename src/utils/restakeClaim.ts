import { ApiPromise } from "@polkadot/api";
import { InjectedAccountWithMeta, InjectedExtension } from "@polkadot/extension-inject/types";
import BigNumber from "bignumber.js";
import { UnclaimedErasType } from "../routes/staking";
import { ISignAndSendCallback, getSignAndSendCallbackWithPromise } from "./getSignAndSendCallback";
import { Vec } from "@polkadot/types";
import { Call } from "@polkadot/types/interfaces";

export interface RestakeClaimProps {
  selectedAccount: InjectedAccountWithMeta;
  unclaimedEras: UnclaimedErasType;
  currentStakingEra: number;
  api: ApiPromise;
  toast: {
    loading: (message: string) => void;
    dismiss: () => void;
    error: (message: string) => void;
    success: (message: string) => void;
  };
  setWaiting: (isWaiting: boolean) => void;
  disableClaiming: boolean;
  enableAutoRestake: boolean;
  web3Enable: (appName: string) => Promise<InjectedExtension[]>;
  web3FromAddress: (address: string) => Promise<InjectedExtension>;
  getSignAndSendCallback: (callbacks: ISignAndSendCallback) => void;
  handleRestakingLogic: () => BigNumber;
}

export const restakeClaim = async ({
  selectedAccount,
  unclaimedEras,
  currentStakingEra,
  api,
  toast,
  setWaiting,
  disableClaiming,
  enableAutoRestake,
  web3Enable,
  web3FromAddress,
  handleRestakingLogic,
}: RestakeClaimProps) => {
  if (!selectedAccount || !unclaimedEras || !currentStakingEra) return;

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

    // Send the transaction batch
    // Casting batch to the correct type to satisfy the linting error
    const castedBatch = batch as Vec<Call>;
    await api.tx.utility.batch(castedBatch).signAndSend(
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