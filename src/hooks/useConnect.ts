import { web3Accounts, web3Enable } from "@polkadot/extension-dapp";
import { shallow } from "zustand/shallow";

import useAccount from "../stores/account";
import useModal, { modalName } from "../stores/modals";

const useConnect = () => {
  const setOpenModal = useModal((state) => state.setOpenModal);

  const { setAccounts, setSelectedAccount } = useAccount(
    (state) => ({
      setAccounts: state.setAccounts,
      setSelectedAccount: state.setSelectedAccount,
    }),
    shallow
  );

  const handleConnect = async () => {
  //  const extensions = await web3Enable("Tinkernet");

  //  if (extensions.length === 0) {
  //    return;
  //  }

  //  const accounts = await web3Accounts();

  //  setAccounts(accounts);

  //  if (accounts.length === 0) {
  //    return;
  //  }

    // if (accounts.length === 1) {
    //  setSelectedAccount(accounts[0]);

    //  return;
    // }

    setOpenModal({ name: modalName.SELECT_ACCOUNT });
  };

  return { handleConnect };
};

export default useConnect;
