import Button from "./Button";
import DisconnectIcon from "../assets/disconnect-icon.svg";
import TinkerYellowIcon from "../assets/tinker-yellow-icon.svg";
import TinkerBlackIcon from "../assets/tinker-black-icon.svg";
import { useEffect, useState } from "react";
import { shallow } from "zustand/shallow";
import useConnect from "../hooks/useConnect";
import useAccount from "../stores/account";
import useModal from "../stores/modals";
import { formatBalanceToTwoDecimals } from "../utils/formatNumber";
import { useBalance } from "../providers/balance";

const LoginButton = () => {
  const { availableBalance } = useBalance();
  const [isHovered, setIsHovered] = useState(false);
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
    const handleResize = () => {
      setIsHovered(false);
    };

    // Set the initial state based on the current window size
    handleResize();

    // Add event listener
    window.addEventListener('resize', handleResize);

    // Remove event listener on cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  useEffect(() => {
    const intervalId = setInterval(() => {
      setShowFirstSpan(prev => !prev);
    }, 3000);

    return () => clearInterval(intervalId);
  }, []);

  const formattedBalance = availableBalance ? formatBalanceToTwoDecimals(availableBalance) : 0;

  return <Button
    mini
    variant="primary"
    group={selectedAccount !== null}
    groupId="disconnect"
    groupLabel={selectedAccount ? <div className="lg:w-10 lg:h-10 w-8 h-8 p-3 flex flex-row items-center justify-center"><img src={DisconnectIcon} alt="Disconnect" /></div> : null}
    groupCallback={onDisconnect}
    onClick={handleConnect}
    onMouseEnter={() => setIsHovered(true)}
    onMouseLeave={() => setIsHovered(false)}
  >
    <div className="flex-grow">
      {selectedAccount ? (
        <div className="overflow-hidden">
          <span className={`relative -top-[2px] flex font-bold transition-transform transform truncate ${ showFirstSpan ? 'translate-y-3' : 'translate-y-12' }`}>
            {selectedAccount.meta.name || selectedAccount.address}
          </span>
          <span className={`relative -top-[8px] md:-top-[10px] flex flex-row items-center gap-1 transition-transform transform ${ showFirstSpan ? 'translate-y-20' : 'translate-y-0' }`}>
            {isHovered ? <img className="lg:w-3 lg:h-3" src={TinkerBlackIcon} alt="tnkr icon" /> :
              <img className="lg:w-3 lg:h-3" src={TinkerYellowIcon} alt="tnkr icon" />}
            <span className="truncate">
              {formattedBalance} TNKR
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