import useModal, { modalName } from "../stores/modals";
import ManageStaking from "./ManageStaking";
import RegisterProject from "./RegisterProject";
import UnbondTokens from "./UnbondTokens";
import ReadMore from "./ReadMore";
import AccountSelector from "./AccountSelector";
import ViewMembers from "./ViewMembers";

const Modals = () => {
  const { openModal } = useModal((state) => ({
    openModal: state.openModal,
  }));

  return (
    <>
      <AccountSelector isOpen={openModal === modalName.SELECT_ACCOUNT} />

      <ManageStaking isOpen={openModal === modalName.MANAGE_STAKING} />

      <RegisterProject isOpen={openModal === modalName.REGISTER_PROJECT} />

      <UnbondTokens isOpen={openModal === modalName.UNBOND_TOKENS} />

      <ReadMore isOpen={openModal === modalName.READ_MORE} />

      <ViewMembers isOpen={openModal === modalName.MEMBERS} />
    </>
  );
};

export default Modals;
