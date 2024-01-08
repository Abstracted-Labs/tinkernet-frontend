import { Dialog } from "@headlessui/react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { shallow } from "zustand/shallow";
import useModal, { Metadata, ModalState, modalName } from "../stores/modals";
import { useEffect, useState } from "react";
import Avatar from "../components/Avatar";
import Button from "../components/Button";
import { BG_GRADIENT } from "../utils/consts";

interface ReadMoreProps { isOpen: boolean; }

interface ReadMoreMetadata extends Metadata {
  name: string;
  description: string;
  image: string;
}

const ReadMore = (props: ReadMoreProps) => {
  const { isOpen } = props;
  const { closeCurrentModal, openModals } = useModal<ModalState>(
    (state) => state,
    shallow
  );
  const [localMetadata, setLocalMetadata] = useState<ReadMoreMetadata | null>(null);
  const targetModal = openModals.find(modal => modal.name === modalName.READ_MORE);
  const metadata = targetModal ? targetModal.metadata : undefined;

  const closeModal = () => {
    closeCurrentModal();
  };

  useEffect(() => {
    if (metadata) {
      setLocalMetadata(metadata as ReadMoreMetadata);
    }

    return () => {
      setLocalMetadata(null);
    };
  }, [metadata]);

  if (!localMetadata) return null;

  const { name, description, image } = localMetadata;

  if (!name || !description || !image) return null;

  return isOpen ? (
    <Dialog open={true} onClose={closeModal}>
      <Dialog.Title className="sr-only">Project Description</Dialog.Title>
      <div className="fixed inset-0 z-[49] h-screen w-full bg-black/10 backdrop-blur-md" />
      <button className="pointer fixed top-0 right-0 z-50 flex cursor-pointer flex-col items-center justify-center bg-neutral-900 bg-transparent bg-opacity-50 p-6 text-gray-100 outline-none duration-500 hover:bg-opacity-100 hover:opacity-30">
        <XMarkIcon className="h-5 w-5" />
        <span className="block">Close</span>
      </button>
      <Dialog.Panel>
        <>
          <div className={`fixed left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 flex flex-col justify-between w-[350px] h-[472px] rounded-xl space-y-4 p-8 border border-[2px] border-neutral-700 ${ BG_GRADIENT }`}>
            <div className="flex items-center space-x-4">
              <Avatar src={image} alt="Project Image" />
              <div className="flex flex-col items-start gap-1 justify-start">
                <div className="font-bold text-white text-[18px] text-center tracking-[0] leading-none">
                  {name}
                </div>
                <span className="text-xs text-tinkerTextGrey">Project Description</span>
              </div>
            </div>
            <div className="overflow-y-auto h-3/5 tinker-scrollbar scrollbar scrollbar-thumb-amber-300 pr-5">
              <p className="text-white text-[14px] tracking-[0] leading-[18px]">
                {description}
              </p>
            </div>
            <div>
              <Button variant="secondary" mini onClick={closeModal}>Close</Button>
            </div>
          </div>
        </>
      </Dialog.Panel>
    </Dialog>
  ) : null;
};

export default ReadMore;
