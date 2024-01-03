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
    set((state) => {
      if (modal) {
        // Check if the modal is already open
        if (state.openModals.some(openModal => openModal.name === modal.name)) {
          console.log('Modal is already open');
          return state;
        }

        // If the modal is not already open, add it to the openModals array
        return { ...state, openModals: [...state.openModals, modal] };
      }

      return state;
    });
  },
  closeCurrentModal: () => {
    set((state) => {
      if (!state.openModals || state.openModals.length === 0) {
        console.log('No open modals to close');
        return state;
      }

      const newOpenModals = state.openModals.slice(0, state.openModals.length - 1);
      return { openModals: newOpenModals };
    });
  },
}));

export type { ModalName, Metadata, ModalState, ModalType };

export { modalName };

export default useModal;
