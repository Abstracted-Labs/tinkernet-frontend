import { InjectedAccountWithMeta } from "@polkadot/extension-inject/types";
// TODO refactor this to use @headlessui/react
import * as Dialog from "@radix-ui/react-dialog";
import { LogoutIcon, XIcon } from "@heroicons/react/outline";

const SelectWallet = ({
  accounts,
  handleWalletSelection,
  handleDisconnect,
  isOpen,
  onOpenChange,
  account,
}: {
  accounts: InjectedAccountWithMeta[];
  handleWalletSelection: (account: InjectedAccountWithMeta | null) => void;
  handleDisconnect: () => void;
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  account: InjectedAccountWithMeta | null;
}) => (
  <Dialog.Root open={isOpen} onOpenChange={onOpenChange}>
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-40 h-screen w-full bg-black/40 backdrop-blur-md" />

      <Dialog.Close asChild>
        <button className="pointer fixed top-0 right-0 z-50 flex cursor-pointer flex-col items-center justify-center bg-gray-900 bg-transparent bg-opacity-50 p-6 text-gray-100 outline-none duration-500 hover:bg-opacity-100 hover:opacity-30">
          <XIcon className="h-5 w-5" />
          <span className="block">close</span>
        </button>
      </Dialog.Close>

      <Dialog.Content>
        <div className="fixed left-1/2 top-1/2 z-50 mx-auto block max-h-[calc(100%-2rem)] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 transform flex-col overflow-auto rounded-lg border border-gray-50 bg-black p-6 sm:w-full">
          <h2 className="text-xl font-bold text-white">Select your Wallet</h2>
          <ul role="list" className="w-full divide-y divide-gray-200">
            {accounts.map((account) => (
              <div
                tabIndex={0}
                key={account.address}
                className="w-full cursor-pointer py-4 text-white hover:text-amber-300"
                onClick={() => handleWalletSelection(account)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleWalletSelection(account);
                  }
                }}
              >
                <span className="block font-bold uppercase">
                  {account.meta?.name}
                </span>
                <span className="block overflow-hidden text-ellipsis text-sm">
                  {account.address}
                </span>
              </div>
            ))}
            {account ? (
              <div
                tabIndex={0}
                key={account.address}
                className="underline-offset-2w-full flex cursor-pointer items-center gap-2 overflow-hidden text-ellipsis py-4 text-white underline hover:text-amber-300"
                onClick={() => handleDisconnect()}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    handleDisconnect();
                  }
                }}
              >
                <LogoutIcon className="h-5 w-5" />
                Disconnect
              </div>
            ) : null}
          </ul>
        </div>
      </Dialog.Content>
    </Dialog.Portal>
  </Dialog.Root>
);

export default SelectWallet;
