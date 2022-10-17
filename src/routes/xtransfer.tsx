import "@polkadot/api-augment";
import { ApiPromise, WsProvider } from "@polkadot/api";
import {
  web3Accounts,
  web3Enable,
  web3FromAddress,
} from "@polkadot/extension-dapp";
import { InjectedAccountWithMeta } from "@polkadot/extension-inject/types";
import { useEffect, useState } from "react";
import { BN, formatBalance, u8aToHex } from "@polkadot/util";
import { Struct } from "@polkadot/types";
import BigNumber from "bignumber.js";
import { Link } from "react-router-dom";
import SelectWallet from "../components/SelectWallet";

import logo from "../assets/logo.svg";
import background from "../assets/background.svg";
import { decodeAddress, encodeAddress } from "@polkadot/util-crypto";
import { ArrowRightIcon, ClipboardCopyIcon } from "@heroicons/react/outline";

const RPC_PROVIDER = "wss://invarch-tinkernet.api.onfinality.io/public-ws";
const RPC_PROVIDER_BSX = "wss://rpc.basilisk.cloud";

type SystemAccount = Struct & {
  data: {
    free: BN;
    reserved: BN;
    miscFrozen: BN;
    feeFrozen: BN;
  };
};

type NavigationProps = {
  className: string;
  "aria-hidden": "true" | "false";
};

const navigation = [
  {
    name: "Twitter",
    href: "https://twitter.com/TinkerParachain",
    icon: (props: NavigationProps) => (
      <svg fill="currentColor" viewBox="0 0 24 24" {...props}>
        <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
      </svg>
    ),
  },
  {
    name: "GitHub",
    href: "https://github.com/InvArch",
    icon: (props: NavigationProps) => (
      <svg fill="currentColor" viewBox="0 0 24 24" {...props}>
        <path
          fillRule="evenodd"
          d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
          clipRule="evenodd"
        />
      </svg>
    ),
  },
  {
    name: "Medium",
    href: "https://github.com/InvArch",
    icon: (props: NavigationProps) => (
      <svg viewBox="0 0 20.24 11.38" fill="currentColor" {...props}>
        <path d="M11.42 5.69c0 3.14-2.56 5.69-5.71 5.69A5.691 5.691 0 0 1 0 5.69C0 2.55 2.56 0 5.71 0s5.7 2.54 5.71 5.69Zm6.26 0c0 2.96-1.28 5.36-2.85 5.36s-2.85-2.4-2.85-5.36S13.25.33 14.82.33s2.85 2.4 2.85 5.36Zm2.56 0c0 2.65-.45 4.8-1 4.8s-1-2.15-1-4.8.45-4.8 1-4.8 1 2.15 1 4.8Z" />
      </svg>
    ),
  },
];

enum Currency {
  BASILISK = "Basilisk",
  TINKERNET = "Tinkernet",
}

const XTransfer = () => {
  const [isSelectWalletModalOpen, setSelectWalletModalOpen] = useState(false);
  const [account, setAccount] = useState<InjectedAccountWithMeta | null>(null);
  const [accounts, setAccounts] = useState<InjectedAccountWithMeta[]>([]);
  const [amount, setAmount] = useState<string>("");
  const [destinationField, setDestinationField] = useState<string>("");
  const [destination, setDestination] = useState<string | null>(null);
  const [pair, setPair] = useState<{
    from: Currency;
    to: Currency;
  }>({
    from: Currency.BASILISK,
    to: Currency.TINKERNET,
  });
  const [balanceInTinkernet, setBalanceInTinkernet] = useState<BigNumber>(
    new BigNumber(0)
  );
  const [balanceInBasilisk, setBalanceInBasilisk] = useState<BigNumber>(
    new BigNumber(0)
  );

  const handleWalletSelection = (account: InjectedAccountWithMeta | null) => {
    setAccount(account);

    setSelectWalletModalOpen(false);
  };

  const handleConnect = async () => {
    const extensions = await web3Enable("InvArch Tinker Network");

    if (extensions.length === 0) {
      return;
    }

    const accounts = await web3Accounts();

    setAccounts(accounts);

    if (accounts.length === 0) {
      return;
    }

    if (accounts.length === 1) {
      setAccount(accounts[0]);

      return;
    }

    setSelectWalletModalOpen(true);
  };

  const handleDisconnect = () => {
    setAccount(null);

    setSelectWalletModalOpen(false);
  };

  const loadBalances = async ({ address }: InjectedAccountWithMeta) => {
    try {
      const wsProvider = new WsProvider(RPC_PROVIDER);

      const api = await ApiPromise.create({ provider: wsProvider });

      const wsProviderBsx = new WsProvider(RPC_PROVIDER_BSX);

      const apiBsx = await ApiPromise.create({ provider: wsProviderBsx });

      const results = await Promise.all([
        // vested locked
        api.query.balances.locks(address),
        // total
        api.query.system.account<SystemAccount>(address),
      ]);

      const vestedLocked = new BigNumber(
        results[0]
          .find((lock) => lock.id.toHuman() === "ormlvest")
          ?.amount.toString() || "0"
      );

      const total = new BigNumber(results[1].data.free.toString());

      const transferable = total.minus(vestedLocked);

      setBalanceInTinkernet(transferable);

      const balanceInBas = new BigNumber(
        (
          (await apiBsx.query.tokens.accounts(address, 6)).toPrimitive() as {
            free: number;
          }
        ).free
      );

      setBalanceInBasilisk(balanceInBas);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    if (!account) return;

    loadBalances(account);
  }, [account]);

  const handleChangedAmount = (e: string) => {
    setAmount(parseFloat(e).toFixed(12).replace(".", ""));
  };

  const handleChangedDestination = (e: string) => {
    setDestinationField(e);
    try {
      const des = u8aToHex(decodeAddress(e));
      setDestination(des);
    } catch {
      setDestination(null);
    }
  };

  const handlePairSwap = () => {
    setPair((pair) => ({
      from: pair.to,
      to: pair.from,
    }));
  };

  const handleXTransferToBasilisk = async () => {
    if (!account) return;
    const injector = await web3FromAddress(account.address);

    const wsProvider = new WsProvider(RPC_PROVIDER);

    const api = await ApiPromise.create({ provider: wsProvider });

    api.tx.xTokens
      .transfer(
        0,
        amount,
        {
          V1: {
            parents: 1,
            interior: {
              X2: [
                { Parachain: 2090 },
                {
                  AccountId32: {
                    network: "Any",
                    id: destination,
                  },
                },
              ],
            },
          },
        },
        "5000000000"
      )
      .signAndSend(account.address, { signer: injector.signer });
  };

  const handleXTransferToTinkernet = async () => {
    if (!account) return;
    const injector = await web3FromAddress(account.address);

    const wsProvider = new WsProvider(RPC_PROVIDER_BSX);

    const api = await ApiPromise.create({ provider: wsProvider });

    api.tx.xTokens
      .transfer(
        6,
        amount,
        {
          V1: {
            parents: 1,
            interior: {
              X2: [
                { Parachain: 2125 },
                {
                  AccountId32: {
                    network: "Any",
                    id: destination,
                  },
                },
              ],
            },
          },
        },
        "5000000000"
      )
      .signAndSend(account.address, { signer: injector.signer });
  };

  const encode = (destination: string | null, prefix: number): string => {
    if (!destination) return "";
    try {
      return encodeAddress(destination, prefix);
    } catch {
      return destination;
    }
  };

  return (
    <>
      <div className="bg-black">
        <nav className="z-10">
          <div className="mx-auto flex max-w-7xl justify-between p-4 sm:px-6 lg:px-8">
            <div className="flex items-center">
              <Link to="/">
                <img src={logo} alt="Tinker Network Logo" />
              </Link>
            </div>
            <div className="flex items-center">
              <button
                className="inline-flex items-center justify-center rounded-md border border-amber-300 bg-amber-300 px-4 py-2 text-base font-medium text-black shadow-sm hover:bg-amber-200 focus:outline-none focus:ring-2 focus:ring-neutral-500 focus:ring-offset-2"
                onClick={handleConnect}
              >
                {account
                  ? account.meta?.name || account.address
                  : "Connect Wallet"}
              </button>
            </div>
          </div>
        </nav>
        <main className="relative flex h-[calc(100vh_-_12rem)] items-center justify-center overflow-hidden">
          <div
            className="hidden md:absolute md:inset-y-0 md:block md:h-full md:w-full"
            aria-hidden="true"
          >
            <div className="mx-auto h-full max-w-7xl">
              <img
                src={background}
                alt="background"
                className="absolute right-full translate-y-0 translate-x-1/3 transform "
              />
              <img
                src={background}
                alt="background"
                className="absolute left-full translate-y-0 -translate-x-1/3 transform"
              />
            </div>
          </div>

          <div className="z-10 w-full py-6 px-8 sm:max-w-xl">
            {!account ? (
              <div className="text-center">
                <h1 className="text-2xl font-bold text-white">
                  Wallet not connected
                </h1>
                <p className="mt-8 text-lg text-white">
                  You can connect your wallet to claim your vested tokens.
                </p>
              </div>
            ) : null}

            {account ? (
              <div className="overflow-hidden rounded-lg border border-neutral-50 bg-black shadow">
                <div className="p-4">
                  <div className="grid grid-cols-3 items-center justify-between p-6 pb-2">
                    <select
                      id="destination"
                      name="destination"
                      className="block w-full rounded-md border border-gray-300 bg-transparent p-4 text-white focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm"
                      value={pair.from}
                      onChange={(e) => {
                        const from = e.target.value as Currency;

                        setPair((pair) => ({
                          from: from,
                          to: from === pair.to ? pair.from : pair.to,
                        }));
                      }}
                    >
                      <option value={Currency.BASILISK}>Basilisk</option>
                      <option value={Currency.TINKERNET}>Tinkernet</option>
                    </select>

                    <div className="flex justify-center">
                      <ArrowRightIcon
                        className="h-5 w-5 cursor-pointer text-white"
                        onClick={handlePairSwap}
                      />
                    </div>

                    <select
                      id="destination"
                      name="destination"
                      className="block w-full rounded-md border border-gray-300 bg-transparent p-4 text-white focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm"
                      value={pair.to}
                      onChange={(e) => {
                        console.log("TODO");
                      }}
                    >
                      {pair.from === Currency.BASILISK ? (
                        <option value={Currency.TINKERNET}>Tinkernet</option>
                      ) : null}
                      {pair.from === Currency.TINKERNET ? (
                        <option value={Currency.BASILISK}>Basilisk</option>
                      ) : null}
                    </select>
                  </div>

                  {pair.from === Currency.BASILISK &&
                  pair.to === Currency.TINKERNET ? (
                    <div className="flex flex-col gap-4 p-6">
                      <div className="relative rounded-md border border-neutral-300 px-3 py-2 shadow-sm focus-within:border-neutral-600 focus-within:ring-1 focus-within:ring-neutral-600">
                        <label
                          htmlFor="amount"
                          className="block text-xs font-medium text-white"
                        >
                          Amount
                        </label>
                        <input
                          type="text"
                          name="amount"
                          id="amount"
                          disabled={balanceInBasilisk.toNumber() === 0}
                          className="block w-full border-0 bg-transparent p-0 text-white focus:ring-0 sm:text-sm"
                          onChange={(e) => handleChangedAmount(e.target.value)}
                        />

                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                          <span className="text-white sm:text-sm" id="currency">
                            TNKR
                          </span>
                        </div>
                      </div>

                      <div className="relative rounded-md border border-neutral-300 px-3 py-2 shadow-sm focus-within:border-neutral-600 focus-within:ring-1 focus-within:ring-neutral-600">
                        <label
                          htmlFor="destination"
                          className="block text-xs font-medium text-white"
                        >
                          Destination
                        </label>

                        <input
                          type="text"
                          name="destination"
                          id="destination"
                          className="block w-full truncate border-0 bg-transparent p-0 pr-8 text-white focus:ring-0 sm:text-sm"
                          value={encode(destinationField, 117)}
                          onChange={(e) =>
                            handleChangedDestination(e.target.value)
                          }
                        />

                        <div
                          className="absolute inset-y-0 right-0 flex cursor-pointer items-center pr-3"
                          onClick={() =>
                            handleChangedDestination(account.address)
                          }
                        >
                          <ClipboardCopyIcon className="h-5 w-5 text-white" />
                        </div>
                      </div>

                      <button
                        type="button"
                        className="inline-flex items-center justify-center rounded-md border border-amber-300 bg-amber-300 px-4 py-2 text-base font-medium text-black shadow-sm focus:outline-none focus:ring-2 focus:ring-neutral-500 focus:ring-offset-2 disabled:opacity-75"
                        disabled={
                          new BigNumber(amount) >=
                            balanceInBasilisk.minus(100000000000) ||
                          !destination
                        }
                        onClick={() => handleXTransferToBasilisk()}
                      >
                        Transfer
                      </button>
                    </div>
                  ) : null}

                  {pair.from === Currency.TINKERNET &&
                  pair.to === Currency.BASILISK ? (
                    <div className="flex flex-col gap-4 p-6">
                      <div className="relative rounded-md border border-neutral-300 px-3 py-2 shadow-sm focus-within:border-neutral-600 focus-within:ring-1 focus-within:ring-neutral-600">
                        <label
                          htmlFor="amount"
                          className="block text-xs font-medium text-white"
                        >
                          Amount
                        </label>
                        <input
                          type="text"
                          name="amount"
                          id="amount"
                          disabled={balanceInTinkernet.toNumber() === 0}
                          className="block w-full border-0 bg-transparent p-0 text-white focus:ring-0 sm:text-sm"
                          onChange={(e) => handleChangedAmount(e.target.value)}
                        />

                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                          <span className="text-white sm:text-sm" id="currency">
                            TNKR
                          </span>
                        </div>
                      </div>

                      <div className="relative rounded-md border border-neutral-300 px-3 py-2 shadow-sm focus-within:border-neutral-600 focus-within:ring-1 focus-within:ring-neutral-600">
                        <label
                          htmlFor="destination"
                          className="block text-xs font-medium text-white"
                        >
                          Destination
                        </label>

                        <input
                          type="text"
                          name="destination"
                          id="destination"
                          className="block w-full truncate border-0 bg-transparent p-0 pr-8 text-white focus:ring-0 sm:text-sm"
                          value={encode(destinationField, 10041)}
                          onChange={(e) =>
                            handleChangedDestination(e.target.value)
                          }
                        />

                        <div
                          className="absolute inset-y-0 right-0 flex cursor-pointer items-center pr-3"
                          onClick={() =>
                            handleChangedDestination(account.address)
                          }
                        >
                          <ClipboardCopyIcon className="h-5 w-5 text-white" />
                        </div>
                      </div>

                      <button
                        type="button"
                        className="inline-flex items-center justify-center rounded-md border border-amber-300 bg-amber-300 px-4 py-2 text-base font-medium text-black shadow-sm focus:outline-none focus:ring-2 focus:ring-neutral-500 focus:ring-offset-2 disabled:opacity-75"
                        disabled={
                          new BigNumber(amount) >=
                            balanceInTinkernet.minus(100000000000) ||
                          !destination
                        }
                        onClick={() => handleXTransferToTinkernet()}
                      >
                        Transfer
                      </button>
                    </div>
                  ) : null}
                </div>

                <div className="border-t border-neutral-50 px-4 py-5 sm:grid sm:w-full sm:grid-cols-2 sm:px-6">
                  <div className="px-6">
                    <span className="text-sm font-normal leading-6 text-white">
                      Balance in Tinkernet:
                    </span>{" "}
                    <span className="text-lg font-normal leading-6 text-white">
                      {formatBalance(balanceInTinkernet.toString(), {
                        decimals: 12,
                        withUnit: "TNKR",
                        forceUnit: "-",
                      })}
                    </span>
                  </div>

                  <div className="px-6">
                    <span className="text-sm font-normal leading-6 text-white">
                      Balance in Basilisk:
                    </span>{" "}
                    <span className="text-lg font-normal leading-6 text-white">
                      {formatBalance(balanceInBasilisk.toString(), {
                        decimals: 12,
                        withUnit: "TNKR",
                        forceUnit: "-",
                      })}
                    </span>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </main>
        <footer>
          <div className="mx-auto max-w-7xl py-12 px-4 sm:px-6 md:flex md:items-center md:justify-between lg:px-8">
            <div className="flex justify-center space-x-6 md:order-2">
              {navigation.map((item) => (
                <a
                  key={item.name}
                  href={item.href}
                  className="text-neutral-400 hover:text-neutral-500"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <span className="sr-only">{item.name}</span>
                  <item.icon className="h-6 w-6" aria-hidden="true" />
                </a>
              ))}
            </div>
            <div className="mt-8 md:order-1 md:mt-0">
              <p className="text-center text-base text-neutral-400">
                &copy; {new Date().getFullYear()} InvArch Tinkernet. All rights
                reserved.
              </p>
            </div>
          </div>
        </footer>
      </div>

      <SelectWallet
        isOpen={isSelectWalletModalOpen}
        onOpenChange={(isOpen: boolean) => setSelectWalletModalOpen(isOpen)}
        handleWalletSelection={handleWalletSelection}
        accounts={accounts}
        account={account}
        handleDisconnect={handleDisconnect}
      />
    </>
  );
};

export default XTransfer;
