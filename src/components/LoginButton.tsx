import Button from "./Button";
import DisconnectIcon from "../assets/disconnect-icon.svg";
import InvarchLogoIcon from "../assets/invarch/invarch-gradient.svg";
import { useEffect, useState } from "react";
import { shallow } from "zustand/shallow";
import useConnect from "../hooks/useConnect";
import useAccount from "../stores/account";
import useModal from "../stores/modals";
import { formatBalanceToTwoDecimals } from "../utils/formatNumber";
import { useBalance } from "../providers/balance";

const LoginButton = () => {
  const { totalBalance } = useBalance();
  const [showFirstSpan, setShowFirstSpan] = useState(true);
  const { handleConnect } = useConnect();
  const closeCurrentModal = useModal((state) => state.closeCurrentModal);
  const { selectedAccount, setSelectedAccount } = useAccount(
    (state) => ({
      selectedAccount: state.selectedAccount,
      setSelectedAccount: state.setSelectedAccount,
    }),
    shallow
  );

  const onDisconnect = () => {
    setSelectedAccount(null);
    closeCurrentModal();
  };

  useEffect(() => {
    const intervalId = setInterval(() => {
      setShowFirstSpan(prev => !prev);
    }, 3000);

    return () => clearInterval(intervalId);
  }, []);

  const formattedBalance = totalBalance ? formatBalanceToTwoDecimals(totalBalance) : 0;

  return <Button
    mini
    variant="primary"
    group={selectedAccount !== null}
    groupId="disconnect"
    groupLabel={selectedAccount ? <div className="lg:w-10 lg:h-10 w-8 h-8 p-3 flex flex-row items-center justify-center"><img src={DisconnectIcon} alt="Disconnect" /></div> : null}
    groupCallback={onDisconnect}
    onClick={handleConnect}
  // onMouseEnter={() => setIsHovered(true)}
  // onMouseLeave={() => setIsHovered(false)}
  >
    <div className="flex-grow">
      {selectedAccount ? (
        <div className="overflow-hidden">
          <span className={`relative -top-[2px] flex font-bold transition-transform transform truncate ${ showFirstSpan ? 'translate-y-3' : 'translate-y-12' }`}>
            {selectedAccount.meta.name || selectedAccount.address}
          </span>
          <span className={`relative -top-[8px] md:-top-[10px] flex flex-row items-center gap-2 transition-transform transform ${ showFirstSpan ? 'translate-y-10' : 'translate-y-0' }`}>
            <img className="w-3 h-3" src={InvarchLogoIcon} alt="varch icon" />
            <span className="truncate">
              {formattedBalance} VARCH
            </span>
          </span>
        </div>
      ) : (
        <>Log In</>
      )}
    </div>
  </Button>;
};

export default LoginButton;