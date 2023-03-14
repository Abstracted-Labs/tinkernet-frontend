import useModal, { modalName } from "../stores/modals";
import SelectAccount from "./SelectAccount";
import ManageStaking from "./ManageStaking";
import RegisterProject from "./RegisterProject";

const Modals = () => {
  const { openModal } = useModal((state) => ({
    openModal: state.openModal,
  }));

  return (
    <>
      <SelectAccount isOpen={openModal === modalName.SELECT_ACCOUNT} />

      <ManageStaking isOpen={openModal === modalName.MANAGE_STAKING} />

      <RegisterProject isOpen={openModal === modalName.REGISTER_PROJECT} />
    </>
  );
};

export default Modals;
