import { Menu } from "@headlessui/react";
import { formatBalance, stringShorten } from "@polkadot/util";
import BigNumber from "bignumber.js";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { shallow } from "zustand/shallow";

import logoFull from "../../assets/logo-full.svg";
import logoIcon from "../../assets/tinkernet-logo-icon.svg";
import useApi from "../../hooks/useApi";

import useConnect from "../../hooks/useConnect";
import useAccount from "../../stores/account";

const Header = () => {
  const { handleConnect } = useConnect();
  const api = useApi();
  const { selectedAccount } = useAccount(
    (state) => ({ selectedAccount: state.selectedAccount }),
    shallow
  );
  const [balance, setBalance] = useState<BigNumber>();

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

  return (
    <nav className="fixed flex flex-row w-full z-20 justify-between bg-black bg-opacity-50 backdrop-blur-sm">
      <div className="w-full flex flex-row justify-between gap-8 p-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-4">
          <div className="flex-shrink-0">
            <Link to="/">
              <img
                className="block h-6 w-auto lg:hidden"
                src={logoIcon}
                alt="Tinkernet Logo"
              />
              <img
                className="hidden h-6 w-auto lg:block"
                src={logoFull}
                alt="Tinkernet Logo"
              />
            </Link>
          </div>

          <div className="flex items-center gap-4 text-xs lg:text-md">
            <Link to="/staking">
              <span className="truncate text-white">Staking</span>
            </Link>
            <Link to="/claim">
              <span className="truncate text-white">Claim</span>
            </Link>
            <Link to="/xtransfer">
              <span className="truncate text-white">X-Transfer</span>
            </Link>
          </div>
        </div>

        <div className="flex items-center gap-4 md:mx-0">
          {selectedAccount ? (
            <Menu as="div" className="relative inline-block text-left">
              <div>
                <Menu.Button className="inline-flex items-center w-full justify-center truncate rounded-md border border-amber-300 bg-amber-300 px-2 lg:px-4 py-2 text-xs md:text-sm font-medium text-black shadow-sm hover:bg-amber-200 focus:outline-none focus:ring-2 focus:ring-neutral-500 focus:ring-offset-2">
                  {selectedAccount ? (
                    <>
                      {stringShorten(selectedAccount.meta.name || selectedAccount.address, 4)}
                      {balance
                        ? ` (${ formatBalance(balance.toString(), {
                          decimals: 12,
                          withUnit: "TNKR",
                          forceUnit: "-",
                        }) })`
                        : null}
                    </>
                  ) : (
                    <>Log In</>
                  )}
                </Menu.Button>
              </div>
              <Menu.Items className="absolute right-0 z-20 mt-2 origin-top-right divide-y divide-neutral-100 rounded-md bg-white p-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                <Menu.Item>
                  {({ active }) => (
                    <button
                      className={`${ active
                        ? "bg-neutral-800 text-white"
                        : "text-neutral-900"
                        } group flex w-full items-center rounded-md px-2 py-2 text-sm`}
                      onClick={handleConnect}
                    >
                      <span className="mr-1">🔀</span> Switch Account
                    </button>
                  )}
                </Menu.Item>
              </Menu.Items>
            </Menu>
          ) : (
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-md border border-amber-300 bg-amber-300 px-4 py-2 text-base font-medium text-black shadow-sm hover:bg-amber-200 focus:outline-none focus:ring-2 focus:ring-neutral-500 focus:ring-offset-2"
              onClick={handleConnect}
            >
              Log In
            </button>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Header;
