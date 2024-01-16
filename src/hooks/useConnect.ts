import { web3Accounts, web3Enable } from "@polkadot/extension-dapp";
import useAccount from "../stores/account";
import useModal, { modalName } from "../stores/modals";
import { useCallback, useEffect, useRef } from "react";

const useConnect = () => {
  const setOpenModal = useModal((state) => state.setOpenModal);
  const initialRender = useRef(true);

  const { setAccounts, setSelectedAccount, extensions: exts } = useAccount(
    (state) => ({
      setAccounts: state.setAccounts,
      setSelectedAccount: state.setSelectedAccount,
      extensions: state.extensions,
    })
  );

  const handleConnect = useCallback(async () => {
    const extensions = await web3Enable("Tinkernet");

    if (extensions.length === 0) {
      setOpenModal({ name: modalName.USE_NOVA });
      return;
    }

    // Filter the exts based on the extensions that are enabled
    const filteredExts = exts.filter(ext => extensions.some(enabledExt => enabledExt.name === ext));

    const accounts = await web3Accounts({ ss58Format: 117, extensions: filteredExts });

    setAccounts(accounts);

    if (accounts.length === 1) {
      setSelectedAccount(accounts[0]);
      setOpenModal({ name: null });
      return;
    }

    setOpenModal({ name: modalName.SELECT_ACCOUNT });
  }, [exts, setAccounts, setSelectedAccount, setOpenModal]);

  useEffect(() => {
    if (initialRender.current) {
      initialRender.current = false;
    } else {
      handleConnect();
    }
  }, [exts, handleConnect]);


  return { handleConnect };
};

export default useConnect;
