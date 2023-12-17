import { Dialog } from "@headlessui/react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { shallow } from "zustand/shallow";
import useModal from "../stores/modals";
import useAccount from "../stores/account";
import { InjectedAccountWithMeta } from "@polkadot/extension-inject/types";
import Identicon from '@polkadot/react-identicon';
import { stringShorten } from "@polkadot/util";
import { capitalizeFirst } from "../utils/capitalizeFirst";
import { getWalletIcon } from "../utils/getWalletIcon";

const AccountSelector = (props: { isOpen: boolean; }) => {
  const { isOpen } = props;
  const setOpenModal = useModal((state) => state.setOpenModal);

  const { selectedAccount, accounts, setSelectedAccount } = useAccount(
    (state) => ({
      selectedAccount: state.selectedAccount,
      accounts: state.accounts,
      setSelectedAccount: state.setSelectedAccount,
    }),
    shallow
  );

  function closeModal() {
    setOpenModal({ name: null });
  }

  async function handleAccountSelection(
    account: InjectedAccountWithMeta | null
  ) {
    if (!account) {
      setSelectedAccount(null);

      setOpenModal({ name: null });

      return;
    }

    setSelectedAccount(account);

    setOpenModal({ name: null });
  };

  return (
    <Dialog open={isOpen} onClose={closeModal}>
      <Dialog.Overlay className="fixed inset-0 z-[49] h-screen w-full bg-neutral-900/40 backdrop-blur-md" />
      <button className="pointer fixed top-0 right-0 z-50 flex cursor-pointer flex-col items-center justify-center bg-neutral-900 bg-transparent bg-opacity-50 p-6 text-gray-100 outline-none duration-500 hover:bg-opacity-100 hover:opacity-30">
        <XMarkIcon className="h-5 w-5" />
        <span className="block">Close</span>
      </button>
      <Dialog.Panel>
        <>
          <div className="fixed left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 flex flex-col justify-between w-[350px] md:w-[530px] h-[472px] bg-tinkerDarkGrey rounded-xl space-y-4 p-8">
            <h2 className="text-md font-bold text-white fixed bg-tinkerDarkGrey w-[calc(100%-2rem)] max-w-lg pb-4">Select your Wallet</h2>
            <ul className="w-full h-80 tinker-scrollbar scrollbar scrollbar-thumb-amber-300 overflow-y-auto mb-10 pt-8 pr-4">
              {accounts.filter(account => getWalletIcon(account.meta?.source) !== undefined).map((account, index) => {
                return (
                  <li
                    role="menuitem"
                    tabIndex={0}
                    key={`${ account.address }-${ index }}`}
                    className={`flex flex-row items-center gap-4 cursor-pointer p-6 transition-colors hover:text-amber-300 ${ account.address === selectedAccount?.address ? 'rounded-xl bg-tinkerGrey text-white hover:bg-tinkerLightGrey' : 'text-white' }`}
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
                      <span className="block overflow-hidden text-ellipsis text-xs md:text-sm  text-gray-500">
                        {stringShorten(account.address, 17)}
                      </span>
                    </div>
                  </li>
                );
              })}
            </ul>
            <button className="flex justify-center items-center w-full h-[46px] bg-tinkerGrey rounded-[10px] text-white hover:bg-tinkerYellow hover:text-black" onClick={closeModal}>
              <span className="font-normal text-[16px] text-center tracking-[0] leading-[normal] whitespace-nowrap">
                Close
              </span>
            </button>
          </div>
          <div className="fixed left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 z-[49] w-[370px] md:w-[550px] h-[492px] rounded-xl border-[30px] border-tinkerGrey border-opacity-50" />
        </>
      </Dialog.Panel>
    </Dialog>
  );
};

export default AccountSelector;