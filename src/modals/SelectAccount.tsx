import { Dialog } from "@headlessui/react";
import {
  ArrowLeftOnRectangleIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { InjectedAccountWithMeta } from "@polkadot/extension-inject/types";
import { shallow } from "zustand/shallow";
import useAccount from "../stores/account";
import useModal from "../stores/modals";

const SelectWallet = ({ isOpen }: { isOpen: boolean; }) => {
  const setOpenModal = useModal((state) => state.setOpenModal);

  const { selectedAccount, accounts, setSelectedAccount } = useAccount(
    (state) => ({
      selectedAccount: state.selectedAccount,
      accounts: state.accounts,
      setSelectedAccount: state.setSelectedAccount,
    }),
    shallow
  );

  const handleAccountSelection = async (
    account: InjectedAccountWithMeta | null
  ) => {
    if (!account) {
      setSelectedAccount(null);

      setOpenModal({ name: null });

      return;
    }

    setSelectedAccount(account);

    setOpenModal({ name: null });
  };

  return (
    <Dialog open={isOpen} onClose={() => setOpenModal({ name: null })}>
      <Dialog.Overlay className="fixed inset-0 z-50 h-screen w-full bg-neutral-900/40 backdrop-blur-md" />

      <button className="pointer fixed top-0 right-0 z-50 flex cursor-pointer flex-col items-center justify-center bg-neutral-900 bg-transparent bg-opacity-50 p-6 text-gray-100 outline-none duration-500 hover:bg-opacity-100 hover:opacity-30">
        <XMarkIcon className="h-5 w-5" />
        <span className="block">Close</span>
      </button>
      <Dialog.Panel>
        <div className="fixed left-1/2 top-1/2 z-50 mx-auto block w-[calc(100%-2rem)] max-h-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 transform flex-col rounded-lg border border-gray-50 bg-neutral-900 p-6 sm:w-full">
          <h2 className="text-xl font-bold text-white fixed bg-neutral-900 w-[calc(100%-2rem)] max-w-lg pb-4">Select your Wallet</h2>
          <ul className="pt-10 w-full divide-y divide-gray-200 h-96 overflow-y-scroll mb-10">
            {accounts.map((account, index) => {
              return (
                <li
                  role="menuitem"
                  tabIndex={0}
                  key={`${ account.address }-${ index }}`}
                  className={`w-full cursor-pointer py-4 transition-colors hover:text-amber-300 ${ account.address === selectedAccount?.address ? 'bg-amber-300 text-black px-4 hover:bg-neutral-900' : 'text-white' }`}
                  onClick={() => {
                    handleAccountSelection(account);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleAccountSelection(account);
                    }
                  }}
                >
                  <span className="font-bold">{account.meta?.name}</span>
                  <span className="float-right text-sm">{account.meta?.source}</span>
                  <span className="block overflow-hidden text-ellipsis text-sm mt-2">
                    {account.address}
                  </span>
                </li>
              );
            })}
          </ul>
          <div className="fixed bottom-1 bg-neutral-900 w-[calc(100%-2rem)] max-w-lg">
            {selectedAccount ? (
              <div
                className="underline-offset-2w-full flex justify-end cursor-pointer items-center gap-2 overflow-hidden text-ellipsis py-4 pr-4 text-white underline transition-colors hover:text-amber-300"
                onClick={() => {
                  handleAccountSelection(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleAccountSelection(null);
                  }
                }}
              >
                <ArrowLeftOnRectangleIcon className="h-5 w-5" />
                Disconnect
              </div>
            ) : null}
          </div>
        </div>
      </Dialog.Panel>
    </Dialog>
  );
};

export default SelectWallet;
