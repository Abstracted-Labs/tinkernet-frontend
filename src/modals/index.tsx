import useModal, { modalName } from "../stores/modals";
import SelectAccount from "./SelectAccount";
import ManageStaking from "./ManageStaking";
import RegisterProject from "./RegisterProject";
import UnbondTokens from "./UnbondTokens";

const Modals = () => {
  const { openModal } = useModal((state) => ({
    openModal: state.openModal,
  }));

  return (
    <>
      <SelectAccount isOpen={openModal === modalName.SELECT_ACCOUNT} />

      <ManageStaking isOpen={openModal === modalName.MANAGE_STAKING} />

      <RegisterProject isOpen={openModal === modalName.REGISTER_PROJECT} />

      <UnbondTokens isOpen={openModal === modalName.UNBOND_TOKENS} />
    </>
  );
};

export default Modals;
