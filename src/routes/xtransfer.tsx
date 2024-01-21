import "@polkadot/api-augment";
import { ApiPromise, WsProvider } from "@polkadot/api";
import { web3FromAddress, web3Enable } from "@polkadot/extension-dapp";
import { InjectedAccountWithMeta } from "@polkadot/extension-inject/types";
import { useCallback, useEffect, useState } from "react";
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
import { getSignAndSendCallbackWithPromise } from "../utils/getSignAndSendCallback";
import useApi from "../hooks/useApi";
import { UnsubscribePromise } from "@polkadot/api/types";
import { FrameSystemAccountInfo } from "@polkadot/types/lookup";
import Input from "../components/Input";
import Button from "../components/Button";
import { ChainLogo, getChainInfo } from "../utils/getChainInfo";
import Dropdown from "../components/Dropdown";

const RPC_PROVIDER_BASILISK = "wss://basilisk-rpc.dwellir.com";

const MINI_BUTTON_STYLE = "cursor-pointer bg-white hover:bg-tinkerYellow text-black py-1 px-2 sm:py-2 sm:px-3 rounded-lg text-xs font-medium";

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

const Transfer = () => {
  const chainInfoLedger = getChainInfo();
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
    from: currency.TINKERNET,
    to: currency.BASILISK,
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

  const setupSubscriptions = useCallback(({
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
  }, [apiBasilisk, api]);

  const setupApiBasilisk = async () => {
    const wsProviderBasilisk = new WsProvider(RPC_PROVIDER_BASILISK);

    const apiBasilisk = await ApiPromise.create({
      provider: wsProviderBasilisk,
    });

    setApiBasilisk(apiBasilisk);

    setLoading(false);
  };

  const loadBalances = useCallback(async ({ address }: InjectedAccountWithMeta) => {
    try {
      if (!apiBasilisk) {
        return;
      }

      setLoading(true);

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
    } finally {
      toast.dismiss();
      toast.success("Balances loaded");
    }
  }, [apiBasilisk, api]);

  const handleChangedAmount = (e: string, availableBalance: BigNumber) => {
    // Remove all non-numeric characters except for the decimal point
    const sanitizedInput = e.replace(/[^\d.]/g, '');

    // Remove leading zeroes after the tens digit
    const inputWithoutLeadingZeroes = sanitizedInput.replace(/^0+([0-9]+)/, '$1');

    // Format the available balance with 12 decimals
    const formattedBalance = new BigNumber(availableBalance.toString()).dividedBy(new BigNumber(10).pow(12));

    if (inputWithoutLeadingZeroes === '') {
      setAmount('');
    } else if (Number(inputWithoutLeadingZeroes) >= 0 && Number(inputWithoutLeadingZeroes) <= formattedBalance.toNumber()) {
      setAmount(inputWithoutLeadingZeroes);
    } else if (Number(inputWithoutLeadingZeroes) > formattedBalance.toNumber()) {
      setAmount(formattedBalance.toString());
    }
  };

  const balanceTNKR25 = () => {
    const balance = balanceInTinkernet.multipliedBy(0.25).dividedBy(new BigNumber(10).pow(12));
    setAmount(balance.toString());
  };

  const balanceTNKR50 = () => {
    const balance = balanceInTinkernet.multipliedBy(0.5).dividedBy(new BigNumber(10).pow(12));
    setAmount(balance.toString());
  };

  const balanceTNKR75 = () => {
    const balance = balanceInTinkernet.multipliedBy(0.75).dividedBy(new BigNumber(10).pow(12));
    setAmount(balance.toString());
  };

  const balanceTNKR100 = () => {
    const balance = balanceInTinkernet.multipliedBy(1).dividedBy(new BigNumber(10).pow(12));
    setAmount(balance.toString());
  };

  const balanceBSX25 = () => {
    const balance = balanceInBasilisk.multipliedBy(0.25).dividedBy(new BigNumber(10).pow(12));
    setAmount(balance.toString());
  };

  const balanceBSX50 = () => {
    const balance = balanceInBasilisk.multipliedBy(0.5).dividedBy(new BigNumber(10).pow(12));
    setAmount(balance.toString());
  };

  const balanceBSX75 = () => {
    const balance = balanceInBasilisk.multipliedBy(0.75).dividedBy(new BigNumber(10).pow(12));
    setAmount(balance.toString());
  };

  const balanceBSX100 = () => {
    const balance = balanceInBasilisk.multipliedBy(1).dividedBy(new BigNumber(10).pow(12));
    setAmount(balance.toString());
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
    try {
      setWaiting(true);
      toast.loading("Initializing transfer...");

      if (!selectedAccount) return;

      // Convert the amount to a BigNumber
      const amountBigNumber = new BigNumber(amount);

      // Validate the amount
      if (amountBigNumber.isNaN() || amountBigNumber.lte(0)) {
        console.error('Invalid amount');
        return;
      }

      await web3Enable("Tinkernet");

      const injector = await web3FromAddress(selectedAccount.address);

      const api = await createApi();

      // Multiply the amount by 10^12 and convert to a string
      const amountToSend = amountBigNumber.multipliedBy(new BigNumber(10).pow(12)).toString();

      await api.tx.xTokens
        .transfer(
          0,
          amountToSend,
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
          getSignAndSendCallbackWithPromise({
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
    } catch (error) {
      console.error(error);
      setWaiting(false);
    }
  };

  const handleXTransferToTinkernet = async () => {
    try {
      setWaiting(true);
      toast.loading("Initializing transfer...");

      if (!selectedAccount) return;

      // Convert the amount to a BigNumber
      const amountBigNumber = new BigNumber(amount);

      // Validate the amount
      if (amountBigNumber.isNaN() || amountBigNumber.lte(0)) {
        console.error('Invalid amount');
        return;
      }

      await web3Enable("Tinkernet");

      const injector = await web3FromAddress(selectedAccount.address);

      const wsProviderBasilisk = new WsProvider(RPC_PROVIDER_BASILISK);

      const apiBasilisk = await ApiPromise.create({
        provider: wsProviderBasilisk,
      });
      console.log('amountBigNumber', amountBigNumber.toString());
      // Multiply the amount by 10^12 and convert to a string
      const amountToSend = amountBigNumber.multipliedBy(new BigNumber(10).pow(12)).toString();

      await apiBasilisk.tx.xTokens
        .transfer(
          6,
          amountToSend,
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
          getSignAndSendCallbackWithPromise({
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
    } catch (error) {
      console.error(error);
      setWaiting(false);
    }
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
    setupApiBasilisk();
  }, []);

  useEffect(() => {
    if (!selectedAccount) return;
    if (!apiBasilisk) return;

    loadBalances(selectedAccount);
  }, [selectedAccount, apiBasilisk, loadBalances]);

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
  }, [api, apiBasilisk, selectedAccount, setupSubscriptions]);

  return (
    <div className="mx-auto w-full flex max-w-7xl flex-col justify-between p-4 sm:px-6 lg:px-8 mt-14 md:mt-0 gap-3">
      <div className="z-10 w-full">
        <h2 className="lg:text-xl font-bold mt-[8px] lg:mt-[12px] mb-[20px] lg:mb-[24px] flex flex-row items-center gap-4">
          <span>Asset Transfers</span>
          <span>{isLoading || isWaiting ? <LoadingSpinner /> : null}</span>
        </h2>

        {!selectedAccount ? (
          <div className="text-center">
            <h5 className="text-sm font-bold text-white">
              Wallet not connected
            </h5>
            <p className="mt-2 text-xs text-white">
              Connect your wallet to transfer assets.
            </p>
          </div>
        ) : null}

        {!isLoading && selectedAccount ? (
          <div className="overflow-hidden w-full rounded-md border border-neutral-50 backdrop-blur-sm shadow">
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
              <div className="flex flex-row items-center gap-0">
                <div className="flex-grow">
                  <label
                    htmlFor="amount"
                    className="block text-xxs font-medium text-white mb-2"
                  >
                    Source Chain
                  </label>
                  <Dropdown
                    defaultOption="Select Source Chain"
                    initialValue={{ name: pair.from }}
                    currentValue={{ name: pair.from }}
                    onSelect={(opt) => {
                      if (!opt) return;
                      const from = opt.name as Currency;

                      setPair((pair) => ({
                        from: from,
                        to: from === pair.to ? pair.from : pair.to,
                      }));
                    }}
                  >
                    {Array.isArray(chainInfoLedger) ? chainInfoLedger.map((chain: ChainLogo) => (
                      <span key={chain.name} id={chain.name} className="flex flex-row gap-1 items-center justify-start text-sm">
                        {chain.logo && <img className="w-4 h-4" src={chain.logo} alt={chain.name} />}
                        <span>{chain.name}</span>
                      </span>
                    )) : []}
                  </Dropdown>
                </div>

                <div className="mx-3 relative top-3">
                  <ArrowRightIcon
                    className="h-5 w-5 cursor-pointer text-white"
                    onClick={handlePairSwap}
                  />
                </div>

                <div className="flex-grow">
                  <label
                    htmlFor="amount"
                    className="block text-xxs font-medium text-white mb-2"
                  >
                    Destination Chain
                  </label>
                  <Dropdown
                    defaultOption="Select Destination Chain"
                    initialValue={{ name: pair.to }}
                    currentValue={{ name: pair.to }}
                    onSelect={(opt) => {
                      if (!opt) return;
                      const to = opt.name as Currency;

                      setPair((pair) => ({
                        from: to === pair.from ? pair.to : pair.from,
                        to: to,
                      }));
                    }}
                  >
                    {Array.isArray(chainInfoLedger) ? chainInfoLedger.map((chain: ChainLogo) => (
                      <span key={chain.name} id={chain.name} className="flex flex-row gap-1 items-center justify-start text-sm">
                        {chain.logo && <img className="w-4 h-4" src={chain.logo} alt={chain.name} />}
                        <span>{chain.name}</span>
                      </span>
                    )) : []}
                  </Dropdown>
                </div>
              </div>

              {pair.from === currency.TINKERNET &&
                pair.to === currency.BASILISK ? (
                <div className="flex flex-col gap-4 mt-3">
                  <div className="flex flex-row items-start justify-between gap-4">
                    <div>
                      <label
                        htmlFor="amount"
                        className="block text-xxs font-medium text-white mb-1"
                      >
                        TNKR Amount
                      </label>
                      <div>
                        <Input type="text"
                          value={amount}
                          name="amount"
                          id="amount"
                          disabled={balanceInTinkernet.toNumber() === 0 || isWaiting}
                          onChange={(e) => handleChangedAmount(e.target.value, balanceInTinkernet)} />
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
                        className="block text-xxs font-medium text-white mb-1 flex flex-row items-end justify-between"
                      >
                        <span>Destination</span>
                      </label>
                      <div>
                        <Input type="text"
                          disabled={isWaiting}
                          name="destination"
                          id="destination"
                          value={encode(destinationField, 63)}
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
                    onClick={handleXTransferToBasilisk}
                  >
                    Transfer
                  </Button>
                </div>
              ) : null}

              {pair.from === currency.BASILISK &&
                pair.to === currency.TINKERNET ? (
                <div className="flex flex-col gap-4 mt-3">
                  <div className="flex flex-col md:flex-row items-stretch justify-between gap-4">
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
                          disabled={balanceInBasilisk.toNumber() === 0 || isWaiting}
                          onChange={(e) => handleChangedAmount(e.target.value, balanceInBasilisk)} />
                        <div className="flex flex-row justify-start mt-2 gap-2">
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
                          disabled={isWaiting}
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
                    onClick={handleXTransferToTinkernet}
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

export default Transfer;
