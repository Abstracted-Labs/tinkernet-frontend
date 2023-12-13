import "@polkadot/api-augment";
import { ApiPromise, WsProvider } from "@polkadot/api";
import { web3FromAddress, web3Enable } from "@polkadot/extension-dapp";
import { InjectedAccountWithMeta } from "@polkadot/extension-inject/types";
import { useEffect, useState } from "react";
import { BN, formatBalance, u8aToHex } from "@polkadot/util";
import { Struct } from "@polkadot/types";
import BigNumber from "bignumber.js";
import { decodeAddress, encodeAddress } from "@polkadot/util-crypto";
import { ArrowRightIcon } from "@heroicons/react/24/outline";
import { toast } from "react-hot-toast";
import useRPC from "../stores/rpc";
import useAccount from "../stores/account";
import { shallow } from "zustand/shallow";
import LoadingSpinner from "../components/LoadingSpinner";
import getSignAndSendCallback from "../utils/getSignAndSendCallback";
import useApi from "../hooks/useApi";
import { UnsubscribePromise } from "@polkadot/api/types";
import { FrameSystemAccountInfo } from "@polkadot/types/lookup";
import Input from "../components/Input";
import Button from "../components/Button";

const RPC_PROVIDER_BASILISK = "wss://basilisk-rpc.dwellir.com";

const MINI_BUTTON_STYLE = "cursor-pointer bg-white hover:bg-tinkerYellow text-black py-1 px-2 rounded-lg text-xxs font-medium";

type SystemAccount = Struct & {
  data: {
    free: BN;
    reserved: BN;
    frozen: BN;
  };
};

const currency = {
  BASILISK: "Basilisk",
  TINKERNET: "Tinkernet",
} as const;

type Currency = (typeof currency)[keyof typeof currency];

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
    from: currency.BASILISK,
    to: currency.TINKERNET,
  });

  const [isLoading, setLoading] = useState(true);
  const [isWaiting, setWaiting] = useState(false);

  const api = useApi();
  const [apiBasilisk, setApiBasilisk] = useState<ApiPromise>();

  const [balanceInTinkernet, setBalanceInTinkernet] = useState<BigNumber>(
    new BigNumber(0)
  );
  const [balanceInBasilisk, setBalanceInBasilisk] = useState<BigNumber>(
    new BigNumber(0)
  );

  const setupSubscriptions = ({
    selectedAccount,
  }: {
    selectedAccount: InjectedAccountWithMeta;
  }) => {
    if (!apiBasilisk) return [];

    const balanceTinkernet = api.query.system.account(
      selectedAccount.address,
      async (account) => {
        const balance = account.toPrimitive() as {
          nonce: string;
          consumers: string;
          providers: string;
          sufficients: string;
          data: {
            free: string;
            reserved: string;
            frozen: string;
          };
        };

        const total = new BigNumber(balance.data.free.toString());
        const frozen = new BigNumber(balance.data.frozen.toString());
        const reserved = new BigNumber(balance.data.reserved.toString());

        const transferable = total.minus(frozen).minus(reserved);

        setBalanceInTinkernet(transferable);
      }
    );

    const balanceBasilisk = apiBasilisk.query.tokens.accounts(
      selectedAccount.address,
      6,
      async (account: FrameSystemAccountInfo) => {
        const balance = account.toPrimitive() as {
          free: string;
        };

        const transferable = new BigNumber(balance.free.toString());

        setBalanceInBasilisk(transferable);
      }
    );

    const unsubs = [balanceTinkernet, balanceBasilisk];

    return unsubs as UnsubscribePromise[];
  };

  const setupApiBasilisk = async () => {
    const wsProviderBasilisk = new WsProvider(RPC_PROVIDER_BASILISK);

    const apiBasilisk = await ApiPromise.create({
      provider: wsProviderBasilisk,
    });

    setApiBasilisk(apiBasilisk);

    setLoading(false);
  };

  const loadBalances = async ({ address }: InjectedAccountWithMeta) => {
    if (!apiBasilisk) {
      return;
    }

    setLoading(true);

    try {
      toast.loading("Loading balances...");

      const balance = await api.query.system.account<SystemAccount>(address);

      const total = new BigNumber(balance.data.free.toString());
      const frozen = new BigNumber(balance.data.frozen.toString());
      const reserved = new BigNumber(balance.data.reserved.toString());

      const transferable = total.minus(frozen).minus(reserved);

      setBalanceInTinkernet(transferable);

      const balanceInBasilisk = new BigNumber(
        (
          (
            await apiBasilisk.query.tokens.accounts(address, 6)
          ).toPrimitive() as {
            free: number;
          }
        ).free
      );

      setBalanceInBasilisk(balanceInBasilisk);

      toast.dismiss();

      setLoading(false);
    } catch (error) {
      toast.dismiss();

      setLoading(false);

      toast.error("Failed to load balances");

      console.error(error);
    }
  };

  useEffect(() => {
    setupApiBasilisk();
  }, []);

  useEffect(() => {
    if (!selectedAccount) return;
    if (!apiBasilisk) return;

    loadBalances(selectedAccount);
  }, [selectedAccount, apiBasilisk]);

  const handleChangedAmount = (e: string) => {
    setAmount(parseFloat(e).toFixed(12).replace(/\./g, ""));
  };

  const balanceTNKR25 = () => {
    setAmount(formatBalance(balanceInTinkernet.multipliedBy(0.25).integerValue().toString(), { decimals: 12, forceUnit: '-', withUnit: false }));
  };

  const balanceTNKR50 = () => {
    setAmount(formatBalance(balanceInTinkernet.multipliedBy(0.5).integerValue().toString(), { decimals: 12, forceUnit: '-', withUnit: false }));
  };

  const balanceTNKR75 = () => {
    setAmount(formatBalance(balanceInTinkernet.multipliedBy(0.75).integerValue().toString(), { decimals: 12, forceUnit: '-', withUnit: false }));
  };

  const balanceTNKR100 = () => {
    setAmount(formatBalance(balanceInTinkernet.multipliedBy(1).integerValue().toString(), { decimals: 12, forceUnit: '-', withUnit: false }));
  };

  const balanceBSX25 = () => {
    setAmount(formatBalance(balanceInBasilisk.multipliedBy(0.25).integerValue().toString(), { decimals: 12, forceUnit: '-', withUnit: false }));
  };

  const balanceBSX50 = () => {
    setAmount(formatBalance(balanceInBasilisk.multipliedBy(0.5).integerValue().toString(), { decimals: 12, forceUnit: '-', withUnit: false }));
  };

  const balanceBSX75 = () => {
    setAmount(formatBalance(balanceInBasilisk.multipliedBy(0.75).integerValue().toString(), { decimals: 12, forceUnit: '-', withUnit: false }));
  };

  const balanceBSX100 = () => {
    setAmount(formatBalance(balanceInBasilisk.multipliedBy(1).integerValue().toString(), { decimals: 12, forceUnit: '-', withUnit: false }));
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

    await web3Enable("Tinkernet");

    const injector = await web3FromAddress(selectedAccount.address);

    const api = await createApi();

    api.tx.xTokens
      .transfer(
        0,
        amount,
        {
          V3: {
            parents: 1,
            interior: {
              X2: [
                { Parachain: 2090 },
                {
                  AccountId32: {
                    id: destination,
                  },
                },
              ],
            },
          },
        },
        "Unlimited"
      )
      .signAndSend(
        selectedAccount.address,
        { signer: injector.signer },
        getSignAndSendCallback({
          onInvalid: () => {
            toast.dismiss();

            toast.error("Invalid transaction");

            setWaiting(false);
          },
          onExecuted: () => {
            toast.dismiss();

            toast.loading("Waiting for confirmation...");

            setWaiting(true);
          },
          onSuccess: () => {
            toast.dismiss();

            toast.success("Transferred successfully");

            setWaiting(false);
          },
          onDropped: () => {
            toast.dismiss();

            toast.error("Transaction dropped");

            setWaiting(false);
          },
        })
      );
  };

  const handleXTransferToTinkernet = async () => {
    if (!selectedAccount) return;

    await web3Enable("Tinkernet");

    const injector = await web3FromAddress(selectedAccount.address);

    const wsProviderBasilisk = new WsProvider(RPC_PROVIDER_BASILISK);

    const apiBasilisk = await ApiPromise.create({
      provider: wsProviderBasilisk,
    });

    apiBasilisk.tx.xTokens
      .transfer(
        6,
        amount,
        {
          V3: {
            parents: 1,
            interior: {
              X2: [
                { Parachain: 2125 },
                {
                  AccountId32: {
                    id: destination,
                  },
                },
              ],
            },
          },
        },
        "Unlimited"
      )
      .signAndSend(
        selectedAccount.address,
        { signer: injector.signer },
        getSignAndSendCallback({
          onInvalid: () => {
            toast.dismiss();

            toast.error("Invalid transaction");

            setWaiting(false);
          },
          onExecuted: () => {
            toast.dismiss();

            toast.loading("Waiting for confirmation...");

            setWaiting(true);
          },
          onSuccess: () => {
            toast.dismiss();

            toast.success("Transferred successfully");

            setWaiting(false);
          },
          onDropped: () => {
            toast.dismiss();

            toast.error("Transaction dropped");

            setWaiting(false);
          },
        })
      );
  };

  const encode = (destination: string | null, prefix: number): string => {
    if (!destination) return "";
    try {
      return encodeAddress(destination, prefix);
    } catch {
      return destination;
    }
  };

  useEffect(() => {
    if (!selectedAccount) return;

    handleChangedDestination(selectedAccount.address);
  }, [selectedAccount]);

  useEffect(() => {
    if (!selectedAccount) return;
    if (!apiBasilisk) return;

    const unsubs = setupSubscriptions({ selectedAccount });

    return () => {
      unsubs.forEach(async (unsub) => (await unsub)());
    };
  }, [api, apiBasilisk]);

  useEffect(() => {
    setAmount("0");
  }, [pair.from, pair.to]);

  return (
    <div className="relative flex flex-col h-[calc(100vh_-_12rem)] mt-10 items-center justify-start overflow-hidden">
      <div className="z-10 w-full py-6 px-8 sm:max-w-2xl">
        <h2 className="lg:text-xl font-bold my-3">
          <span>X-Transfer</span>
        </h2>

        {!selectedAccount ? (
          <div className="text-center">
            <h5 className="text-2xl font-bold text-white">
              Wallet not connected
            </h5>
            <p className="mt-8 text-lg text-white">
              You can connect your wallet to use x-transfer.
            </p>
          </div>
        ) : null}

        {isLoading ? (
          <div className="flex items-center justify-center">
            <LoadingSpinner />
          </div>
        ) : null}

        {!isLoading && selectedAccount ? (
          <div className="overflow-hidden rounded-md border border-neutral-50 backdrop-blur-sm shadow">
            <div className="border-b border-neutral-50 p-4">
              <div className="flex flex-row items-center justify-around gap-4">
                <div className="flex flex-col items-center">
                  <span className="text-lg font-bold text-white leading-none">
                    {formatBalance(balanceInTinkernet.toString(), {
                      decimals: 12,
                      withUnit: "TNKR",
                      forceUnit: "-",
                    })}
                  </span>
                  <span className="text-xxs font-normal text-white">
                    Free balance on Tinkernet
                  </span>
                </div>

                <div className="flex flex-col items-center">
                  <span className="text-lg font-bold text-white leading-none">
                    {formatBalance(balanceInBasilisk.toString(), {
                      decimals: 12,
                      withUnit: "TNKR",
                      forceUnit: "-",
                    })}
                  </span>
                  <span className="text-xxs font-normal text-white">
                    Free balance on Basilisk
                  </span>
                </div>
              </div>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-5 items-center justify-between">
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
                  <option value={currency.BASILISK}>Basilisk</option>
                  <option value={currency.TINKERNET}>Tinkernet</option>
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
                    const to = e.target.value as Currency;

                    setPair((pair) => ({
                      from: to === pair.from ? pair.to : pair.from,
                      to: to,
                    }));
                  }}
                >
                  {pair.from === currency.BASILISK ? (
                    <option value={currency.TINKERNET}>Tinkernet</option>
                  ) : null}
                  {pair.from === currency.TINKERNET ? (
                    <option value={currency.BASILISK}>Basilisk</option>
                  ) : null}
                </select>
              </div>

              {pair.from === currency.TINKERNET &&
                pair.to === currency.BASILISK ? (
                <div className="flex flex-col gap-4 mt-3">
                  <div className="flex flex-row items-start justify-between gap-4">
                    <div>
                      <label
                        htmlFor="amount"
                        className="block text-xxs font-medium text-white mb-2"
                      >
                        TNKR Amount
                      </label>
                      <div>
                        <Input type="text"
                          value={amount}
                          name="amount"
                          id="amount"
                          disabled={balanceInTinkernet.toNumber() === 0}
                          onChange={(e) => handleChangedAmount(e.target.value)} />
                        <div className="flex flex-row justify-between mt-2 gap-2">
                          <span className={MINI_BUTTON_STYLE} onClick={balanceTNKR25}>25%</span>
                          <span className={MINI_BUTTON_STYLE} onClick={balanceTNKR50}>50%</span>
                          <span className={MINI_BUTTON_STYLE} onClick={balanceTNKR75}>75%</span>
                          <span className={MINI_BUTTON_STYLE} onClick={balanceTNKR100}>100%</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex-grow">
                      <label
                        htmlFor="destination"
                        className="block text-xxs font-medium text-white mb-2 flex flex-row items-end justify-between"
                      >
                        <span>Destination</span>
                      </label>
                      <div>
                        <Input type="text"
                          name="destination"
                          id="destination"
                          value={encode(destinationField, 10041)}
                          onChange={(e) => handleChangedDestination(e.target.value)} />
                        <div className="flex flex-row justify-end mt-2">
                          <span className={MINI_BUTTON_STYLE} onClick={() =>
                            handleChangedDestination(selectedAccount.address)
                          }>To Myself</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <Button
                    variant="primary"
                    type="button"
                    disabled={
                      (pair.from === "Tinkernet"
                        ? new BigNumber(amount).div(1000000000000).toNumber() >=
                        balanceInTinkernet
                          .minus(100000000000)
                          .div(1000000000000)
                          .toNumber() || !destination
                        : new BigNumber(amount).div(1000000000000).toNumber() >=
                        balanceInBasilisk
                          .minus(100000000000)
                          .div(1000000000000)
                          .toNumber() || !destination) || isWaiting
                    }
                    onClick={() => handleXTransferToBasilisk()}
                  >
                    Transfer
                  </Button>
                </div>
              ) : null}

              {pair.from === currency.BASILISK &&
                pair.to === currency.TINKERNET ? (
                <div className="flex flex-col gap-4 mt-3">
                  <div className="flex flex-row items-start justify-between gap-4">
                    <div>
                      <label
                        htmlFor="amount"
                        className="block text-xxs font-medium text-white mb-2"
                      >
                        TNKR Amount
                      </label>
                      <div>
                        <Input type="text"
                          value={amount}
                          name="amount"
                          id="amount"
                          disabled={balanceInBasilisk.toNumber() === 0}
                          onChange={(e) => handleChangedAmount(e.target.value)} />
                        <div className="flex flex-row justify-between mt-2 gap-2">
                          <span className={MINI_BUTTON_STYLE} onClick={balanceBSX25}>25%</span>
                          <span className={MINI_BUTTON_STYLE} onClick={balanceBSX50}>50%</span>
                          <span className={MINI_BUTTON_STYLE} onClick={balanceBSX75}>75%</span>
                          <span className={MINI_BUTTON_STYLE} onClick={balanceBSX100}>100%</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex-grow">
                      <label
                        htmlFor="destination"
                        className="block text-xxs font-medium text-white mb-2 flex flex-row items-end justify-between"
                      >
                        <span>Destination</span>
                      </label>
                      <div>
                        <Input type="text"
                          name="destination"
                          id="destination"
                          value={encode(destinationField, 10041)}
                          onChange={(e) => handleChangedDestination(e.target.value)} />
                        <div className="flex flex-row justify-end mt-2">
                          <span className={MINI_BUTTON_STYLE} onClick={() =>
                            handleChangedDestination(selectedAccount.address)
                          }>To Myself</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <Button
                    variant="primary"
                    type="button"
                    disabled={
                      (pair.from === "Basilisk"
                        ? new BigNumber(amount).div(1000000000000).toNumber() >=
                        balanceInBasilisk
                          .minus(100000000000)
                          .div(1000000000000)
                          .toNumber() || !destination
                        : new BigNumber(amount).div(1000000000000).toNumber() >=
                        balanceInTinkernet
                          .minus(100000000000)
                          .div(1000000000000)
                          .toNumber() || !destination) || isWaiting
                    }
                    onClick={() => handleXTransferToTinkernet()}
                  >
                    Transfer
                  </Button>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default XTransfer;
