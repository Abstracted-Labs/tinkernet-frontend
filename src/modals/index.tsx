import useModal, { ModalName } from "../stores/modals";
import SelectAccount from "./SelectAccount";

const Modals = () => {
  const { openModal } = useModal((state) => ({
    openModal: state.openModal,
  }));

  return (
    <>
      <SelectAccount isOpen={openModal === ModalName.SELECT_ACCOUNT} />
    </>
  );
};

export default Modals;
