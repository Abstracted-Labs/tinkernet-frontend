import { Dialog } from "@headlessui/react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { shallow } from "zustand/shallow";
import useModal, { Metadata, ModalState } from "../stores/modals";
import { useEffect, useState } from "react";
import Avatar from "../components/Avatar";
import { AnyJson } from "@polkadot/types/types";
import { stringShorten } from "@polkadot/util";

interface ViewMembersProps { isOpen: boolean; }

interface ViewMembersMetadata extends Metadata {
  name: string;
  image: string;
  members: AnyJson[];
}

const ViewMembers = (props: ViewMembersProps) => {
  const { isOpen } = props;
  const { setOpenModal, metadata } = useModal<ModalState>(
    (state) => state,
    shallow
  );
  const [localMetadata, setLocalMetadata] = useState<ViewMembersMetadata | null>(null);

  function closeModal() {
    setOpenModal({ name: null });
  }

  useEffect(() => {
    if (metadata) {
      setLocalMetadata(metadata as ViewMembersMetadata);
    }

    return () => {
      setLocalMetadata(null);
    };
  }, [metadata]);

  if (!localMetadata) return null;
  const { name, members, image } = localMetadata;
  console.log(name, members, image);

  if (!name || !members || !image) return null;

  return (
    <Dialog open={isOpen} onClose={closeModal}>
      <Dialog.Overlay className="fixed inset-0 z-[49] h-screen w-full bg-neutral-900/40 backdrop-blur-md" />
      <button className="pointer fixed top-0 right-0 z-[50] flex cursor-pointer flex-col items-center justify-center bg-neutral-900 bg-transparent bg-opacity-50 p-6 text-gray-100 outline-none duration-500 hover:bg-opacity-100 hover:opacity-30">
        <XMarkIcon className="h-5 w-5" />
        <span className="block">Close</span>
      </button>
      <Dialog.Panel>
        <>
          <div className="fixed left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 z-[50] flex flex-col justify-between w-[350px] h-[472px] bg-tinkerDarkGrey rounded-xl space-y-4 p-8">
            <div className="flex items-center space-x-4">
              <Avatar src={image} alt="Project Image" />
              <div className="flex flex-col items-start gap-1 justify-start">
                <div className="font-bold text-white text-[18px] text-center tracking-[0] leading-none">
                  {name}
                </div>
                <span className="text-xs text-tinkerTextGrey">Members: {members ? members.length : 0}</span>
              </div>
            </div>
            <div className="overflow-y-auto h-3/5 tinker-scrollbar scrollbar scrollbar-thin scrollbar-thumb-amber-300 pr-5">
              <p className="text-white text-[14px] tracking-[0] leading-[18px] flex flex-col gap-2">
                {members.map((member) => <span key={member?.toString()}>{stringShorten(member?.toString() || "", 13)}</span>)}
              </p>
            </div>
            <button className="flex justify-center items-center w-full h-[46px] bg-tinkerGrey rounded-[10px] text-white hover:bg-tinkerYellow hover:text-black" onClick={closeModal}>
              <span className="font-normal text-[16px] text-center tracking-[0] leading-[normal] whitespace-nowrap">
                Close
              </span>
            </button>
          </div>
          <div className="fixed left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 z-[49] w-[370px] h-[492px] rounded-xl border-[30px] border-tinkerGrey border-opacity-50" />
        </>
      </Dialog.Panel>
    </Dialog>
  );
};

export default ViewMembers;