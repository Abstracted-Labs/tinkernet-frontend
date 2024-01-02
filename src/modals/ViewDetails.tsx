import { Dialog } from "@headlessui/react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { shallow } from "zustand/shallow";
import useModal, { Metadata, ModalState, modalName } from "../stores/modals";
import { useEffect, useState } from "react";

interface ViewDetailsProps { isOpen: boolean; }

interface ViewDetailsMetadata extends Metadata {
  children?: JSX.Element;
}

const ViewDetails = (props: ViewDetailsProps) => {
  const { isOpen } = props;
  const { closeCurrentModal, openModals } = useModal<ModalState>(
    (state) => state,
    shallow
  );
  const [localMetadata, setLocalMetadata] = useState<ViewDetailsMetadata | null>(null);
  const targetModal = openModals.find(modal => modal.name === modalName.VIEW_DETAILS);
  const metadata = targetModal ? targetModal.metadata : undefined;

  const closeModal = () => {
    closeCurrentModal();
  };

  useEffect(() => {
    if (metadata) {
      setLocalMetadata(metadata as ViewDetailsMetadata);
    }

    return () => {
      setLocalMetadata(null);
    };
  }, [metadata]);

  if (!localMetadata) return null;

  const { children } = localMetadata;

  if (!children) return null;

  return (
    <Dialog open={isOpen} onClose={closeModal}>
      <Dialog.Overlay className="fixed inset-0 z-[49] h-screen w-full bg-neutral-900/40 backdrop-blur-md" />
      <button className="pointer fixed top-0 right-0 z-50 flex cursor-pointer flex-col items-center justify-center bg-neutral-900 bg-transparent bg-opacity-50 p-6 text-gray-100 outline-none duration-500 hover:bg-opacity-100 hover:opacity-30">
        <XMarkIcon className="h-5 w-5" />
        <span className="block">Close</span>
      </button>
      <Dialog.Panel>
        <>
          <div className="fixed left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 flex flex-col justify-between w-[350px] h-[440px] bg-tinkerDarkGrey rounded-xl space-y-4">
            {children}
          </div>
          <div className="fixed left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 z-[49] w-[370px] h-[460px] rounded-xl border-[30px] border-tinkerGrey border-opacity-50" />
        </>
      </Dialog.Panel>
    </Dialog>
  );
};

export default ViewDetails;
