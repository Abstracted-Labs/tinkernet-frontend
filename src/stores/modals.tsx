import { createWithEqualityFn } from "zustand/traditional";

const modalName = {
  SELECT_ACCOUNT: "SELECT_ACCOUNT",
  MANAGE_STAKING: "MANAGE_STAKING",
  REGISTER_PROJECT: "REGISTER_PROJECT",
  UNBOND_TOKENS: "UNBOND_TOKENS",
  READ_MORE: "READ_MORE",
  MEMBERS: "MEMBERS",
} as const;

type ModalName = (typeof modalName)[keyof typeof modalName];

type Metadata = Record<string, unknown>;

type ModalState = {
  openModal: ModalName | null;
  setOpenModal: ({
    name,
    metadata,
  }: ModalType) => void;
  metadata?: Metadata;
};

type ModalType = {
  name: ModalName | null;
  metadata?: Metadata;
};

const useModal = createWithEqualityFn<ModalState>()((set) => ({
  openModal: null,
  metadata: undefined,
  setOpenModal: (modal) => {
    if (!modal) {
      set({}, true);

      return;
    }

    set(() => ({ openModal: modal.name, metadata: modal.metadata }));
  },
}));

export type { ModalName, Metadata, ModalState, ModalType };

export { modalName };

export default useModal;
