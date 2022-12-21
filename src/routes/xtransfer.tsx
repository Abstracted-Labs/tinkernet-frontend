import "@polkadot/api-augment";
import { ApiPromise, WsProvider } from "@polkadot/api";
import { web3FromAddress } from "@polkadot/extension-dapp";
import { InjectedAccountWithMeta } from "@polkadot/extension-inject/types";
import { useEffect, useState } from "react";
import { BN, formatBalance, u8aToHex } from "@polkadot/util";
import { Struct } from "@polkadot/types";
import BigNumber from "bignumber.js";

import background from "../assets/background.svg";
import { decodeAddress, encodeAddress } from "@polkadot/util-crypto";
import { ArrowRightIcon, ClipboardIcon } from "@heroicons/react/24/outline";
import { toast } from "react-hot-toast";
import useRPC from "../stores/rpc";
import useAccount from "../stores/account";
import shallow from "zustand/shallow";

const RPC_PROVIDER = "wss://tinker.invarch.network";
const RPC_PROVIDER_BSX = "wss://rpc.basilisk.cloud";

type SystemAccount = Struct & {
  data: {
    free: BN;
    reserved: BN;
    miscFrozen: BN;
    feeFrozen: BN;
  };
};

enum Currency {
  BASILISK = "Basilisk",
  TINKERNET = "Tinkernet",
}

const XTransfer = () => {
  const { createApi } = useRPC();
  const { selectedAccount } = useAccount(
    (state) => ({ selectedAccount: state.selectedAccount }),
    shallow
  );
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

  const loadBalances = async ({ address }: InjectedAccountWithMeta) => {
    try {
      toast.loading("Loading balances...");
      const api = await createApi();

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

      toast.dismiss();

      toast.success("Balances loaded");
    } catch (error) {
      toast.dismiss();

      toast.error("Failed to load balances");

      console.error(error);
    }
  };

  useEffect(() => {
    if (!selectedAccount) return;

    loadBalances(selectedAccount);
  }, [selectedAccount]);

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
    if (!selectedAccount) return;

    const injector = await web3FromAddress(selectedAccount.address);

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
      .signAndSend(selectedAccount.address, { signer: injector.signer });
  };

  const handleXTransferToTinkernet = async () => {
    if (!selectedAccount) return;
    const injector = await web3FromAddress(selectedAccount.address);

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
      .signAndSend(selectedAccount.address, { signer: injector.signer });
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

      <div className="z-10 w-full py-6 px-8 sm:max-w-2xl">
        {!selectedAccount ? (
          <div className="text-center">
            <h1 className="text-2xl font-bold text-white">
              Wallet not connected
            </h1>
            <p className="mt-8 text-lg text-white">
              You can connect your wallet to use x-transfer.
            </p>
          </div>
        ) : null}

        {selectedAccount ? (
          <div className="overflow-hidden rounded-lg border border-neutral-50 bg-black shadow">
            <div className="p-4">
              <div className="grid grid-cols-5 items-center justify-between p-6 pb-2">
                <select
                  id="destination"
                  name="destination"
                  className="col-span-2 block w-full rounded-md border border-gray-300 bg-transparent p-4 text-white focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm"
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
                  className="col-span-2 block w-full rounded-md border border-gray-300 bg-transparent p-4 text-white focus:border-neutral-500 focus:outline-none focus:ring-neutral-500 sm:text-sm"
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
                      onChange={(e) => handleChangedDestination(e.target.value)}
                    />

                    <div
                      className="absolute inset-y-0 right-0 flex cursor-pointer items-center pr-3"
                      onClick={() =>
                        handleChangedDestination(selectedAccount.address)
                      }
                    >
                      <ClipboardIcon className="h-5 w-5 text-white" />
                    </div>
                  </div>

                  <button
                    type="button"
                    className="inline-flex items-center justify-center rounded-md border border-amber-300 bg-amber-300 px-4 py-2 text-base font-medium text-black shadow-sm focus:outline-none focus:ring-2 focus:ring-neutral-500 focus:ring-offset-2 disabled:opacity-75"
                    disabled={
                      new BigNumber(amount) >=
                        balanceInTinkernet.minus(100000000000) || !destination
                    }
                    onClick={() => handleXTransferToBasilisk()}
                  >
                    Transfer
                  </button>
                </div>
              ) : null}

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
                      onChange={(e) => handleChangedDestination(e.target.value)}
                    />

                    <div
                      className="absolute inset-y-0 right-0 flex cursor-pointer items-center pr-3"
                      onClick={() =>
                        handleChangedDestination(selectedAccount.address)
                      }
                    >
                      <ClipboardIcon className="h-5 w-5 text-white" />
                    </div>
                  </div>

                  <button
                    type="button"
                    className="inline-flex items-center justify-center rounded-md border border-amber-300 bg-amber-300 px-4 py-2 text-base font-medium text-black shadow-sm focus:outline-none focus:ring-2 focus:ring-neutral-500 focus:ring-offset-2 disabled:opacity-75"
                    disabled={
                      new BigNumber(amount) >=
                        balanceInBasilisk.minus(100000000000) || !destination
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
                  Balance on Tinkernet:
                </span>

                <br />

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
                  Balance on Basilisk:
                </span>

                <br />

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
    </>
  );
};

export default XTransfer;
