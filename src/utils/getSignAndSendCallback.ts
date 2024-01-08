import { ISubmittableResult } from "@polkadot/types/types";

export interface ISignAndSendCallback {
  onInvalid?: () => void;
  onExecuted?: () => void;
  onSuccess?: () => void;
  onDropped?: () => void;
}

export const getSignAndSendCallbackWithPromise = (callbacks: ISignAndSendCallback) => {
  const wrappedCallbacks: ISignAndSendCallback = {
    onInvalid: async () => {
      if (callbacks.onInvalid) {
        callbacks.onInvalid();
      }
    },
    onExecuted: async () => {
      if (callbacks.onExecuted) {
        callbacks.onExecuted();
      }
    },
    onSuccess: async () => {
      if (callbacks.onSuccess) {
        callbacks.onSuccess();
      }
    },
    onDropped: async () => {
      if (callbacks.onDropped) {
        callbacks.onDropped();
      }
    },
  };
  return getSignAndSendCallback(wrappedCallbacks);
};

const getSignAndSendCallback = (props: ISignAndSendCallback) => {
  const {
    onInvalid,
    onExecuted,
    onSuccess,
    onDropped,
  } = props;
  let hasFinished = false;

  return (result: ISubmittableResult) => {
    if (hasFinished) {
      return;
    }

    if (result.status.isInvalid) {
      if (onInvalid) onInvalid();

      hasFinished = true;
    } else if (result.status.isReady) {
      if (onExecuted) onExecuted();
    } else if (result.status.isDropped) {
      if (onDropped) onDropped();

      hasFinished = true;
    } else if (result.status.isInBlock || result.status.isFinalized) {
      if (onSuccess) onSuccess();

      hasFinished = true;
    }
  };
};

export default getSignAndSendCallback;
