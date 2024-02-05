import { ApiPromise } from "@polkadot/api";
import { ISubmittableResult } from "@polkadot/types/types";

export interface ISignAndSendCallback {
  onInvalid?: () => void;
  onExecuted?: () => void;
  onSuccess?: () => void;
  onDropped?: () => void;
  onError?: (message: string) => void;
  onInterrupt?: (message: string) => void;
  api?: ApiPromise;
}

export const getSignAndSendCallbackWithPromise = (callbacks: ISignAndSendCallback, api: ApiPromise) => {
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
    onError: async (message: string) => {
      if (callbacks.onError) {
        callbacks.onError(message);
      }
    },
    onInterrupt: async (message: string) => {
      if (callbacks.onInterrupt) {
        callbacks.onInterrupt(message);
      }
    },
    api
  };
  return getSignAndSendCallback(wrappedCallbacks);
};

export const getSignAndSendCallback = (props: ISignAndSendCallback) => {
  const {
    onInvalid,
    onExecuted,
    onSuccess,
    onDropped,
    onError,
    onInterrupt,
    api
  } = props;
  let hasFinished = false;

  return (result: ISubmittableResult) => {
    if (hasFinished || !api) {
      return;
    }

    if (result.status.isInvalid) {
      onInvalid?.();
      hasFinished = true;
    } else if (result.status.isReady) {
      onExecuted?.();
    } else if (result.status.isDropped) {
      onDropped?.();
      hasFinished = true;
    } else if (result.status.isInBlock || result.status.isFinalized) {
      let batchInterruptedHandled = false;
      result.events.forEach(({ event: { data, method, section } }) => {
        if (method === 'BatchInterrupted' && !batchInterruptedHandled) {
          batchInterruptedHandled = true;
          data.forEach((d) => {
            const moduleError = d as unknown as { isModule: boolean; asModule: { index: number, error: number; }; };
            if (moduleError.isModule) {
              const { index, error } = moduleError.asModule;
              const decoded = api.registry.findMetaError(new Uint8Array([index, error]));
              const message = `${ section }.${ method }: ${ decoded.name }`;
              onInterrupt?.(message);
            }
          });
        }
      });

      if (result.dispatchError) {
        if (result.dispatchError.isModule) {
          const decoded = api.registry.findMetaError(result.dispatchError.asModule);
          const message = `${ decoded.section }.${ decoded.method }: ${ decoded.docs.join(' ') } (${ decoded.index })`;
          onError?.(message);
        } else {
          const message = result.dispatchError.toString();
          onError?.(message);
        }
      } else {
        const isSuccess = result.events.some(({ event }) => api.events.system.ExtrinsicSuccess.is(event));
        if (isSuccess) {
          console.log("Transaction succeeded");
          onSuccess?.();
        } else {
          onError?.("Transaction did not succeed");
        }
      }
      hasFinished = true;
    }
  };
};

export default getSignAndSendCallback;