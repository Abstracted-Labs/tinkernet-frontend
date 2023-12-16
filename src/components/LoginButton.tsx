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
import { stringShorten, formatBalance } from "@polkadot/util";

const LoginButton = () => {
  const [balance, setBalance] = useState<BigNumber>();
  const [isHovered, setIsHovered] = useState(false);
  const { handleConnect } = useConnect();
  const api = useApi();
  const setOpenModal = useModal((state) => state.setOpenModal);
  const { selectedAccount, setSelectedAccount } = useAccount(
    (state) => ({
      selectedAccount: state.selectedAccount,
      setSelectedAccount: state.setSelectedAccount,
    }),
    shallow
  );

  const onDisconnect = () => {
    setSelectedAccount(null);
    setOpenModal({ name: null });
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

  return <Button
    mini
    variant="primary"
    group={selectedAccount !== null}
    groupId="disconnect"
    groupLabel={selectedAccount ? <div className="lg:w-10 lg:h-10 w-8 h-8 p-3 flex items-center justify-center"><img src={DisconnectIcon} alt="Disconnect" /></div> : null}
    groupCallback={onDisconnect}
    onClick={handleConnect}
    onMouseEnter={() => setIsHovered(true)}
    onMouseLeave={() => setIsHovered(false)}
  >
    <span className="p-4">
      {selectedAccount ? (
        <span className="flex flex-row justify-between items-center gap-3">
          <span>
            {stringShorten(selectedAccount.meta.name || selectedAccount.address, 4)}
          </span>
          <span className="flex flex-row items-center gap-1">
            <img className="lg:w-3 lg:h-3 fill-tinkerYellow" src={isHovered ? TinkerBlackIcon : TinkerYellowIcon} alt="tnkr icon" />
            {balance
              ? ` ${ formatBalance(balance.toString(), {
                decimals: 12,
                withUnit: false,
                forceUnit: "-",
              }) }`
              : null}
          </span>
        </span>
      ) : (
        <>Log In</>
      )}
    </span>
  </Button>;
};

export default LoginButton;