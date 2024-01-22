import { Dialog } from "@headlessui/react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { shallow } from "zustand/shallow";
import useModal from "../stores/modals";
import useAccount from "../stores/account";
import { InjectedAccountWithMeta } from "@polkadot/extension-inject/types";
import Identicon from '@polkadot/react-identicon';
import { stringShorten } from "@polkadot/util";
import { capitalizeFirst } from "../utils/capitalizeFirst";
import { WalletNameEnum, getWalletIcon } from "../utils/getWalletIcon";
import Button from "../components/Button";
import { BG_GRADIENT } from "../utils/consts";

const AccountSelector = (props: { isOpen: boolean; }) => {
  const { isOpen } = props;
  const closeCurrentModal = useModal((state) => state.closeCurrentModal);

  const { selectedAccount, accounts, setSelectedAccount, setExtensions, extensions } = useAccount(
    (state) => ({
      selectedAccount: state.selectedAccount,
      accounts: state.accounts,
      setSelectedAccount: state.setSelectedAccount,
      setExtensions: state.setExtensions,
      extensions: state.extensions,
    }),
    shallow
  );

  const closeModal = () => {
    closeCurrentModal();
  };

  const handleAccountSelection = async (
    account: InjectedAccountWithMeta | null
  ) => {
    if (!account) {
      setSelectedAccount(null);
      closeModal();

      return;
    }

    setSelectedAccount(account);
    closeModal();
  };

  const handleExtensionClick = async (walletName: string) => {
    if (!walletName) {
      console.error("Wallet name is not provided");
      return;
    }

    if (!Object.values(WalletNameEnum).includes(walletName as WalletNameEnum)) {
      console.error("Invalid wallet name");
      return;
    }

    if (!extensions.includes(walletName)) {
      setExtensions([...extensions, walletName]);
    } else {
      setExtensions(extensions.filter((extension) => extension !== walletName));

      if (selectedAccount && selectedAccount.meta.source === walletName) {
        setSelectedAccount(null);
      }
    }
  };

  return isOpen ? (
    <Dialog open={true} onClose={closeModal}>
      <Dialog.Title className="sr-only">Select your Wallet</Dialog.Title>
      <div className="fixed inset-0 z-[49] h-screen w-full bg-black/10 backdrop-blur-md" />
      <button className="pointer fixed top-0 right-0 z-50 flex cursor-pointer flex-col items-center justify-center bg-neutral-900 bg-transparent bg-opacity-50 p-6 text-gray-100 outline-none duration-500 hover:bg-opacity-100 hover:opacity-30">
        <XMarkIcon className="h-5 w-5" />
        <span className="block">Close</span>
      </button>
      <Dialog.Panel>
        <>
          <div className={`fixed left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 flex flex-col justify-between w-[350px] md:w-[530px] rounded-xl space-y-4 px-8 p-8 gap-2 border border-[2px] border-tinkerLightGrey ${ BG_GRADIENT }`}>
            <div>
              <h2 className="text-md font-bold text-white w-[310px] md:w-[490px] bg-tinkerDarkGrey">
                <span>Select your Wallet</span>
              </h2>
              <div className="flex-shrink flex flex-row justify-center gap-3 mt-3">
                {Object.values(WalletNameEnum).map((walletName) => {
                  const walletIcon = getWalletIcon(walletName);
                  return (
                    <button key={walletName} onClick={() => handleExtensionClick(walletName)} className={`rounded-lg p-3 border-1 bg-tinkerYellow bg-opacity-10 hover:border-tinkerYellow hover:border-opacity-80 hover:bg-opacity-20 ${ extensions.includes(walletName) ? 'bg-tinkerYellow bg-opacity-20 border border-tinkerYellow border-opacity-60' : 'border border-tinkerYellow border-opacity-20 hover:bg-opacity-10' }`}>

                      <div className="flex flex-col items-center justify-center">
                        <img src={walletIcon} alt={walletName} className={`h-5 w-5 ${ extensions.includes(walletName) ? '' : 'opacity-30' }`} />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
            <ul className="w-full h-96 tinker-scrollbar scrollbar scrollbar-thumb-amber-300 overflow-y-scroll pr-4">
              {accounts.filter(account => getWalletIcon(account.meta?.source) !== undefined).map((account, index) => {
                return (
                  <li
                    role="menuitem"
                    tabIndex={0}
                    key={`${ account.address }-${ index }}`}
                    className={`flex flex-row items-center gap-4 cursor-pointer p-6 transition-colors hover:text-tinkerYellow ${ account.address === selectedAccount?.address ? 'rounded-xl bg-tinkerGrey text-white hover:bg-tinkerLightGrey' : 'text-white' }`}
                    onClick={() => {
                      handleAccountSelection(account);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        handleAccountSelection(account);
                      }
                    }}
                  >
                    <div className={`rounded-full p-1 flex items-center ${ account.address !== selectedAccount?.address ? 'bg-tinkerLightGrey' : 'bg-tinkerGrey' }`}>
                      <Identicon value={account.address} size={47} theme="substrate" />
                    </div>
                    <div className="flex flex-col gap-0">
                      <div className="flex flex-row gap-1 items-center">
                        {typeof getWalletIcon(account.meta?.source) === 'undefined' ?
                          <span className="text-xxs text-ellipsis">{account.meta?.source}</span> :
                          <img src={getWalletIcon(account.meta?.source)} alt={account.meta?.source} className="w-4 h-4 mr-1" />
                        }
                        <span className="text-md font-normal text-ellipsis">{capitalizeFirst(account.meta?.name)}</span>
                      </div>
                      <span className="block overflow-hidden text-ellipsis text-xs md:text-sm  text-gray-500 hover:underline hover:underline-offset-4">
                        {stringShorten(account.address, 17)}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
            <div>
              <Button variant="secondary" mini onClick={closeModal}>Close</Button>
            </div>
          </div>
        </>
      </Dialog.Panel>
    </Dialog>
  ) : null;
};

export default AccountSelector;