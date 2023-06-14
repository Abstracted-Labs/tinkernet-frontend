import { ISubmittableResult } from "@polkadot/types/types";

const getSignAndSendCallback = ({
  onInvalid,
  onExecuted,
  onSuccess,
  onDropped,
}: {
  onInvalid?: (payload: ISubmittableResult) => void;
  onExecuted?: (payload: ISubmittableResult) => void;
  onSuccess?: (payload: ISubmittableResult) => void;
  onDropped?: (payload: ISubmittableResult) => void;
}) => {
  let hasFinished = false;

  return (result: ISubmittableResult) => {
    if (hasFinished) {
      return;
    }

    if (result.status.isInvalid) {
      if (onInvalid) onInvalid(result);

      hasFinished = true;
    } else if (result.status.isReady) {
      if (onExecuted) onExecuted(result);
    } else if (result.status.isDropped) {
      if (onDropped) onDropped(result);

      hasFinished = true;
    } else if (result.status.isInBlock || result.status.isFinalized) {
      if (onSuccess) onSuccess(result);

      hasFinished = true;
    }
  };
};

export default getSignAndSendCallback;
