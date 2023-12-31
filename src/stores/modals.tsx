import { createWithEqualityFn } from "zustand/traditional";

const modalName = {
  SELECT_ACCOUNT: "SELECT_ACCOUNT",
  MANAGE_STAKING: "MANAGE_STAKING",
  REGISTER_PROJECT: "REGISTER_PROJECT",
  UNBOND_TOKENS: "UNBOND_TOKENS",
  READ_MORE: "READ_MORE",
  MEMBERS: "MEMBERS",
  VIEW_DETAILS: "VIEW_DETAILS",
  USE_NOVA: "USE_NOVA",
} as const;

type ModalName = (typeof modalName)[keyof typeof modalName];

type Metadata = Record<string, unknown>;

type ModalState = {
  openModals: ModalType[];
  setOpenModal: (modal: ModalType) => void;
  closeCurrentModal: () => void;
};

type ModalType = {
  name: ModalName | null;
  metadata?: Metadata;
};

const useModal = createWithEqualityFn<ModalState>()((set) => ({
  openModals: [],
  setOpenModal: (modal) => {
    if (!modal) {
      return;
    }

    set((state) => ({ openModals: [...state.openModals, modal] }));
  },
  closeCurrentModal: () => {
    set((state) => {
      const newOpenModals = [...state.openModals];
      newOpenModals.pop();
      return { openModals: newOpenModals };
    });
  },
}));

export type { ModalName, Metadata, ModalState, ModalType };

export { modalName };

export default useModal;
