import Button from "./Button";
import DisconnectIcon from "../assets/disconnect-icon.svg";
import TinkerYellowIcon from "../assets/tinker-yellow-icon.svg";
import TinkerBlackIcon from "../assets/tinker-black-icon.svg";
import { useEffect, useState } from "react";
import BigNumber from "bignumber.js";
import { shallow } from "zustand/shallow";
import useApi from "../hooks/useApi";
import useConnect from "../hooks/useConnect";
import useAccount from "../stores/account";
import useModal from "../stores/modals";
import { stringShorten } from "@polkadot/util";
import { formatBalanceToTwoDecimals } from "../utils/formatNumber";

const LoginButton = () => {
  const [balance, setBalance] = useState<BigNumber>();
  const [isHovered, setIsHovered] = useState(false);
  const { handleConnect } = useConnect();
  const api = useApi();
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

  const loadBalance = async () => {
    if (!selectedAccount) return;

    await api.query.system.account(selectedAccount.address, ({ data }) => {
      const balance = data.toPrimitive() as {
        free: string;
        reserved: string;
        miscFrozen: string;
        feeFrozen: string;
      };

      setBalance(new BigNumber(balance.free));
    });
  };

  useEffect(() => {
    loadBalance();
  }, [selectedAccount, api]);

  const formattedBalance = balance ? formatBalanceToTwoDecimals(balance) : 0;

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
        <div className="flex flex-row justify-between items-center gap-5">
          <span className="flex font-bold">
            {stringShorten(selectedAccount.meta.name || selectedAccount.address, 4)}
          </span>
          <span className="flex flex-row items-center gap-1">
            <img className="lg:w-3 lg:h-3 fill-tinkerYellow" src={isHovered ? TinkerBlackIcon : TinkerYellowIcon} alt="tnkr icon" />
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