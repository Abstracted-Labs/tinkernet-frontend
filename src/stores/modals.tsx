import create from "zustand";

enum ModalName {
  SELECT_ACCOUNT,
}

type Metadata = Record<string, unknown>;

type ModalState = {
  openModal: ModalName | null;
  setOpenModal: ({
    name,
    metadata,
  }: {
    name: ModalName | null;
    metadata?: Metadata;
  }) => void;
  metadata?: Metadata;
};

const useModal = create<ModalState>()((set) => ({
  openModal: null,
  setOpenModal: ({
    name,
    metadata,
  }: {
    name: ModalName | null;
    metadata?: Metadata;
  }) => set(() => ({ openModal: name, metadata })),
  metadata: undefined,
}));

export { ModalName };

export default useModal;
