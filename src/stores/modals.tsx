import create from "zustand";

const modalName = {
  SELECT_ACCOUNT: "SELECT_ACCOUNT",
  MANAGE_STAKING: "MANAGE_STAKING",
} as const;

type ModalName = typeof modalName[keyof typeof modalName];

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
  metadata: undefined,
  setOpenModal: ({ name, metadata }) =>
    set(() => ({ openModal: name, metadata })),
}));

export type { ModalName, Metadata };

export { modalName };

export default useModal;
