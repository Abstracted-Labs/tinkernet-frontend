import { toast } from "react-hot-toast";

export const autoRestake = (bool: boolean) => {
  // use toasts to show if auto-restake is enabled or disabled
  if (bool) {
    toast.success("Auto-restake enabled");
  } else {
    toast.error("Auto-restake disabled");
  }
  // save the value to local storage
  localStorage.setItem("autoRestake", JSON.stringify(bool));
};