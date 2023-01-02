import useModal, { ModalName } from "../stores/modals";
import SelectAccount from "./SelectAccount";
import ManageStaking from "./ManageStaking";

const Modals = () => {
  const { openModal } = useModal((state) => ({
    openModal: state.openModal,
  }));

  return (
    <>
      <SelectAccount isOpen={openModal === ModalName.SELECT_ACCOUNT} />

      <ManageStaking isOpen={openModal === ModalName.MANAGE_STAKING} />
    </>
  );
};

export default Modals;
