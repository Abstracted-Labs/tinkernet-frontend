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
import Button from "../components/Button";
import { BG_GRADIENT } from "../utils/consts";

const AccountSelector = (props: { isOpen: boolean; }) => {
  const { isOpen } = props;
  const closeCurrentModal = useModal((state) => state.closeCurrentModal);

  const { selectedAccount, accounts, setSelectedAccount } = useAccount(
    (state) => ({
      selectedAccount: state.selectedAccount,
      accounts: state.accounts,
      setSelectedAccount: state.setSelectedAccount,
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

      closeCurrentModal();

      return;
    }

    setSelectedAccount(account);

    closeCurrentModal();
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
          <div className={`fixed left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 flex flex-col justify-between w-[350px] md:w-[530px] h-[472px] rounded-xl space-y-4 p-8 border border-[2px] border-tinkerLightGrey ${ BG_GRADIENT }`}>
            <h2 className="text-md font-bold text-white w-[310px] md:w-[490px] fixed bg-tinkerDarkGrey flex flex-row items-stretch pb-4">Select your Wallet</h2>
            <ul className="w-full h-90 tinker-scrollbar scrollbar scrollbar-thumb-amber-300 overflow-y-auto mb-10 pt-8 pr-4">
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