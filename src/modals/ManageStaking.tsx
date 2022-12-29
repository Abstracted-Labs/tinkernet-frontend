import { Dialog } from "@headlessui/react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import shallow from "zustand/shallow";

import useModal from "../stores/modals";

const SelectWallet = ({ isOpen }: { isOpen: boolean }) => {
  const { setOpenModal, metadata } = useModal(
    (state) => ({
      setOpenModal: state.setOpenModal,
      metadata: state.metadata,
    }),
    shallow
  );

  if (!metadata) return null;

  const handleStake = async () => {
    console.log("STAKE");
  };

  const handleUnstake = async () => {
    console.log("UNSTAKE");
  };

  return (
    <Dialog open={isOpen} onClose={() => setOpenModal({ name: null })}>
      <Dialog.Overlay className="fixed inset-0 z-40 h-screen w-full bg-black/40 backdrop-blur-md" />

      <button className="pointer fixed top-0 right-0 z-50 flex cursor-pointer flex-col items-center justify-center bg-black bg-transparent bg-opacity-50 p-6 text-gray-100 outline-none duration-500 hover:bg-opacity-100 hover:opacity-30">
        <XMarkIcon className="h-5 w-5" />
        <span className="block">close</span>
      </button>
      <Dialog.Panel>
        <div className="fixed left-1/2 top-1/2 z-50 mx-auto block max-h-[calc(100%-2rem)] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 transform flex-col overflow-auto rounded-md border border-gray-50 bg-black p-6 sm:w-full">
          <span className="text-white">asdasdasdas</span>
        </div>
      </Dialog.Panel>
    </Dialog>
  );
};

export default SelectWallet;
