import { ISubmittableResult } from "@polkadot/types/types";
import toast from "react-hot-toast";

const getSignAndSendCallback = ({ onSuccess }: { onSuccess?: () => void }) => {
  let hasFinished = false;

  return ({ status }: ISubmittableResult) => {
    if (hasFinished) {
      return;
    }

    if (status.isInvalid) {
      toast.dismiss();

      toast.error("Transaction is invalid");

      hasFinished = true;
    } else if (status.isReady) {
      toast.loading("Submitting transaction...");
    } else if (status.isDropped) {
      toast.dismiss();

      toast.error("Transaction dropped");

      hasFinished = true;
    } else if (status.isInBlock || status.isFinalized) {
      hasFinished = true;

      if (onSuccess) onSuccess();

      toast.dismiss();
    }
  };
};

export default getSignAndSendCallback;
