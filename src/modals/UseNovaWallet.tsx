import { Dialog } from "@headlessui/react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { shallow } from "zustand/shallow";
import useModal from "../stores/modals";
import Button from "../components/Button";
import { BG_GRADIENT } from "../utils/consts";

const UseNovaWallet = ({ isOpen }: { isOpen: boolean; }) => {
  const { closeCurrentModal } = useModal(
    (state) => state,
    shallow
  );

  const closeModal = () => {
    closeCurrentModal();
  };

  return (
    <Dialog open={isOpen} onClose={closeCurrentModal}>
      <>
        <Dialog.Overlay className="fixed inset-0 z-[49] h-screen w-full bg-black/10 backdrop-blur-md" />
        <button className="pointer fixed top-0 right-0 z-50 flex cursor-pointer flex-col items-center justify-center bg-neutral-900 bg-transparent bg-opacity-50 p-6 text-gray-100 outline-none duration-500 hover:bg-opacity-100 hover:opacity-30">
          <XMarkIcon className="h-5 w-5" />
          <span className="block">Close</span>
        </button>
        <Dialog.Panel>
          <>
            <div className={`fixed left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 flex flex-col justify-between w-[350px] h-[472px] rounded-xl space-y-4 p-8 border border-2 border-neutral-700 ${ BG_GRADIENT }`}>
              <p className="text-white text-sm">
                Greetings, traveler! <br /><br />If you're viewing this from a mobile device, you will need a wallet browser to connect your existing Polkadot-based wallet address to view our dApp, such as the one found inside the Nova Wallet app. Download Nova Wallet for iOS and Android, located <a target="_blank" className="text-tinkerYellow hover:underline underline-offset-2" rel="noreferrer" href="https://novawallet.io/">here</a>. <br /><br />If you're viewing this from a desktop browser, download and install the Talisman wallet extension, located <a target="_blank" className="text-tinkerYellow hover:underline underline-offset-2" rel="noreferrer" href="https://www.talisman.xyz/download">here</a>.
              </p>
              <div>
                <Button variant="secondary" mini onClick={closeModal}>Close</Button>
              </div>
            </div>
          </>
        </Dialog.Panel>
      </>
    </Dialog>
  );
};

export default UseNovaWallet;
