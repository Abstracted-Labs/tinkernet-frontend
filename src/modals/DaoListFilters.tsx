import { Dialog } from "@headlessui/react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { shallow } from "zustand/shallow";
import useModal from "../stores/modals";
import Button from "../components/Button";
import { BG_GRADIENT } from "../utils/consts";

const DaoListFilters = ({ isOpen }: { isOpen: boolean; }) => {
  const { closeCurrentModal } = useModal(
    (state) => state,
    shallow
  );

  const closeModal = () => {
    closeCurrentModal();
  };

  return isOpen ? (
    <Dialog open={true} onClose={closeCurrentModal}>
      <>
        <Dialog.Title className="sr-only">Notice</Dialog.Title>
        <div className="fixed inset-0 z-[49] h-screen w-full bg-black/10 backdrop-blur-md" />
        <button className="pointer fixed top-0 right-0 z-50 flex cursor-pointer flex-col items-center justify-center bg-neutral-900 bg-transparent bg-opacity-50 p-6 text-gray-100 outline-none duration-500 hover:bg-opacity-100 hover:opacity-30">
          <XMarkIcon className="h-5 w-5" />
          <span className="block">Close</span>
        </button>
        <Dialog.Panel>
          <>
            <div className={`fixed left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 flex flex-col justify-between w-[350px] h-[472px] rounded-xl space-y-4 p-8 border border-2 border-neutral-700 ${ BG_GRADIENT }`}>
              <div>
                <h2 className="text-md font-bold text-white bg-tinkerDarkGrey">
                  <span>Refine Search Results</span>
                </h2>
                <p className="text-white text-sm">
                  boop beep bop
                </p>
              </div>
              <div>
                <Button variant="primary" mini onClick={closeModal}>Apply Filters</Button>
              </div>
            </div>
          </>
        </Dialog.Panel>
      </>
    </Dialog>
  ) : null;
};

export default DaoListFilters;
