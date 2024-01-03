import useModal, { modalName } from "../stores/modals";
import ManageStaking from "./ManageStaking";
import RegisterProject from "./RegisterProject";
import UnbondTokens from "./UnbondTokens";
import ReadMore from "./ReadMore";
import AccountSelector from "./AccountSelector";
import ViewMembers from "./ViewMembers";
import ViewDetails from "./ViewDetails";
import UseNovaWallet from "./UseNovaWallet";

const Modals = () => {
  const { openModals } = useModal((state) => ({
    openModals: state.openModals,
  }));

  const modalComponents = {
    [modalName.SELECT_ACCOUNT]: AccountSelector,
    [modalName.MANAGE_STAKING]: ManageStaking,
    [modalName.REGISTER_PROJECT]: RegisterProject,
    [modalName.UNBOND_TOKENS]: UnbondTokens,
    [modalName.READ_MORE]: ReadMore,
    [modalName.MEMBERS]: ViewMembers,
    [modalName.VIEW_DETAILS]: ViewDetails,
    [modalName.USE_NOVA]: UseNovaWallet,
  };

  return (
    <>
      {openModals.map((modal, index) => {
        const Component = modalComponents[modal.name as keyof typeof modalComponents];
        return Component ? <Component key={modal.name} isOpen={index === openModals.length - 1} /> : null;
      })}
    </>
  );
};

export default Modals;
