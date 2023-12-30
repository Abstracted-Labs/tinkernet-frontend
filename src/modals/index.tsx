import useModal, { modalName } from "../stores/modals";
import ManageStaking from "./ManageStaking";
import RegisterProject from "./RegisterProject";
import UnbondTokens from "./UnbondTokens";
import ReadMore from "./ReadMore";
import AccountSelector from "./AccountSelector";
import ViewMembers from "./ViewMembers";
import ViewDetails from "./ViewDetails";

const Modals = () => {
  const { openModals } = useModal((state) => ({
    openModals: state.openModals,
  }));

  return (
    <>
      {openModals.map((modal, index) => {
        const isOpen = index === openModals.length - 1;
        switch (modal.name) {
          case modalName.SELECT_ACCOUNT:
            return <AccountSelector key={modal.name} isOpen={isOpen} />;
          case modalName.MANAGE_STAKING:
            return <ManageStaking key={modal.name} isOpen={isOpen} />;
          case modalName.REGISTER_PROJECT:
            return <RegisterProject key={modal.name} isOpen={isOpen} />;
          case modalName.UNBOND_TOKENS:
            return <UnbondTokens key={modal.name} isOpen={isOpen} />;
          case modalName.READ_MORE:
            return <ReadMore key={modal.name} isOpen={isOpen} />;
          case modalName.MEMBERS:
            return <ViewMembers key={modal.name} isOpen={isOpen} />;
          case modalName.VIEW_DETAILS:
            return <ViewDetails key={modal.name} isOpen={isOpen} />;
          default:
            return null;
        }
      })}
    </>
  );
};

export default Modals;
