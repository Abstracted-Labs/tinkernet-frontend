import { ApiPromise } from "@polkadot/api";
import { ISubmittableResult } from "@polkadot/types/types";

export interface ISignAndSendCallback {
  onInvalid?: () => void;
  onExecuted?: () => void;
  onSuccess?: () => void;
  onDropped?: () => void;
  onError?: (message: string) => void;
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
              const message = `${ section }.${ method } at [${ decoded.index }]: ${ decoded.name }`;
              onError?.(message); // Use onError callback for custom error handling
            }
          });
          hasFinished = true;
        }
      });

      if (result.dispatchError) {
        if (result.dispatchError.isModule) {
          const decoded = api.registry.findMetaError(result.dispatchError.asModule);
          const message = `${ decoded.section }.${ decoded.method }: ${ decoded.docs.join(' ') } (${ decoded.index })`;
          onError?.(message); // Use onError callback for custom error handling
        } else {
          const message = result.dispatchError.toString();
          onError?.(message); // Use onError callback for custom error handling
        }
        hasFinished = true;
      } else {
        const isSuccess = result.events.some(({ event }) => api.events.system.ExtrinsicSuccess.is(event));
        if (isSuccess) {
          onSuccess?.();
        } else {
          onError?.("Transaction did not succeed"); // Use onError callback for custom error handling
        }
        hasFinished = true;
      }
    }
  };
};

export default getSignAndSendCallback;
