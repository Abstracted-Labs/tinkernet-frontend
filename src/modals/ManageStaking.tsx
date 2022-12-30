import { Dialog, Tab } from "@headlessui/react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { WsProvider, ApiPromise } from "@polkadot/api";
import { web3Enable, web3FromAddress } from "@polkadot/extension-dapp";
import { formatBalance } from "@polkadot/util";
import BigNumber from "bignumber.js";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import shallow from "zustand/shallow";
import useAccount from "../stores/account";

import useModal from "../stores/modals";

enum FormType {
  STAKE = "STAKE",
  UNSTAKE = "UNSTAKE",
}

const classNames = (...classes: string[]) => {
  return classes.filter(Boolean).join(" ");
};

const BRAINSTORM_RPC_URL = "wss://brainstorm.invarch.network";

const ManageStaking = ({ isOpen }: { isOpen: boolean }) => {
  const { setOpenModal, metadata } = useModal(
    (state) => ({
      setOpenModal: state.setOpenModal,
      metadata: state.metadata,
    }),
    shallow
  );
  const { selectedAccount } = useAccount(
    (state) => ({ selectedAccount: state.selectedAccount }),
    shallow
  );
  const [stakeAmount, setStakeAmount] = useState("");
  const [unstakeAmount, setUnstakeAmount] = useState("");
  const [stakedAmount, setStakedAmount] = useState<BigNumber>();
  const [availableAmount, setAvailableAmount] = useState<BigNumber>();

  const handleStake = async () => {
    if (!selectedAccount) return;

    if (!metadata) throw new Error("METADATA_NOT_AVAILABLE");

    toast.loading("Staking...");

    const wsProviderBST = new WsProvider(BRAINSTORM_RPC_URL);

    await web3Enable("Tinkernet");

    const injector = await web3FromAddress(selectedAccount.address);

    const apiBST = await ApiPromise.create({ provider: wsProviderBST });

    await apiBST.tx.ocifStaking
      .stake(metadata.key, stakeAmount)
      .signAndSend(
        selectedAccount.address,
        { signer: injector.signer },
        (result) => {
          toast.dismiss();

          if (result.status.isInBlock) {
            console.log("In block");
          } else if (result.status.isFinalized) {
            console.log("Finalized");

            toast.success("Successfully staked!");
          }
        }
      );

    setOpenModal({ name: null });
  };

  const handleUnstake = async () => {
    if (!selectedAccount) return;

    if (!metadata) throw new Error("METADATA_NOT_AVAILABLE");

    toast.loading("Unstaking...");

    const wsProviderBST = new WsProvider(BRAINSTORM_RPC_URL);

    await web3Enable("Tinkernet");

    const injector = await web3FromAddress(selectedAccount.address);

    const apiBST = await ApiPromise.create({ provider: wsProviderBST });

    await apiBST.tx.ocifStaking
      .unstake(metadata.key, unstakeAmount)
      .signAndSend(
        selectedAccount.address,
        { signer: injector.signer },
        (result) => {
          toast.dismiss();
          if (result.status.isInBlock) {
            console.log("In block");
          } else if (result.status.isFinalized) {
            console.log("Finalized");

            toast.success("Successfully unstaked!");
          }
        }
      );

    setOpenModal({ name: null });
  };

  const loadBalances = async () => {
    if (!selectedAccount) return;

    if (!metadata) return;

    const wsProviderBST = new WsProvider(BRAINSTORM_RPC_URL);

    const apiBST = await ApiPromise.create({ provider: wsProviderBST });

    const balanceInfo = await apiBST.query.system.account(
      selectedAccount.address
    );

    const balance = balanceInfo.toPrimitive() as {
      nonce: string;
      consumers: string;
      providers: string;
      sufficients: string;
      data: {
        free: string;
        reserved: string;
        miscFrozen: string;
        feeFrozen: string;
      };
    };

    const availableAmount = new BigNumber(balance.data.free);

    setAvailableAmount(availableAmount);

    const generalStakerInfo = await apiBST.query.ocifStaking.generalStakerInfo(
      metadata.key,
      selectedAccount.address
    );

    const info = generalStakerInfo.toPrimitive() as {
      stakes: { era: string; staked: string }[];
    };

    const latestInfo = info.stakes.at(-1);

    if (!latestInfo) {
      setStakedAmount(new BigNumber(0));
      setAvailableAmount(new BigNumber(0));
      return;
    }

    const stakedAmount = new BigNumber(latestInfo.staked);

    setStakedAmount(stakedAmount);
  };

  useEffect(() => {
    loadBalances();
  }, [metadata?.key]);

  return (
    <Dialog open={isOpen} onClose={() => setOpenModal({ name: null })}>
      <Dialog.Overlay className="fixed inset-0 z-40 h-screen w-full bg-black/40 backdrop-blur-md" />

      <button className="pointer fixed top-0 right-0 z-50 flex cursor-pointer flex-col items-center justify-center bg-black bg-transparent bg-opacity-50 p-6 text-gray-100 outline-none duration-500 hover:bg-opacity-100 hover:opacity-30">
        <XMarkIcon className="h-5 w-5" />
        <span className="block">close</span>
      </button>
      <Dialog.Panel>
        <div className="fixed left-1/2 top-1/2 z-50 mx-auto block max-h-[calc(100%-2rem)] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 transform flex-col overflow-auto rounded-md border border-gray-50 bg-black p-6 sm:w-full">
          <h2 className="text-xl font-bold text-white">Manage Staking</h2>

          <div className="mt-4 flex flex-col justify-between gap-4">
            <div className="flex flex-col justify-between gap-4 sm:flex-auto">
              <div className="text-sm text-white">
                {availableAmount ? (
                  <>
                    Available:{" "}
                    <span className="font-bold">
                      {" "}
                      {formatBalance(availableAmount.toString(), {
                        decimals: 12,
                        withUnit: "TNKR",
                        forceUnit: "-",
                      }).replace(".0000", "")}
                    </span>
                  </>
                ) : null}
              </div>

              <div className="text-sm text-white">
                {stakedAmount && stakedAmount.toString() !== "0" ? (
                  <>
                    Staked:{" "}
                    <span className="font-bold">
                      {formatBalance(stakedAmount.toString(), {
                        decimals: 12,
                        withUnit: "TNKR",
                        forceUnit: "-",
                      }).replace(".0000", "")}
                    </span>
                  </>
                ) : null}
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <Tab.Group>
                  {stakedAmount && stakedAmount.toString() !== "0" ? (
                    <Tab.List className="flex gap-6 space-x-1 rounded-md bg-neutral-900">
                      <Tab
                        key={FormType.STAKE}
                        className={({ selected }) =>
                          classNames(
                            "w-full rounded-md py-2.5 text-sm font-medium leading-5 text-neutral-700",
                            "ring-white ring-opacity-60 ring-offset-2 ring-offset-neutral-400 focus:outline-none focus:ring-2",
                            selected
                              ? "bg-white shadow"
                              : "bg-neutral-900 text-neutral-100 transition-colors hover:bg-white/[0.12] hover:text-white"
                          )
                        }
                      >
                        Stake
                      </Tab>
                      <Tab
                        key={FormType.UNSTAKE}
                        className={({ selected }) =>
                          classNames(
                            "w-full rounded-md py-2.5 text-sm font-medium leading-5 text-neutral-700",
                            "ring-white ring-opacity-60 ring-offset-2 ring-offset-neutral-400 focus:outline-none focus:ring-2",
                            selected
                              ? "bg-white shadow"
                              : "bg-neutral-900 text-neutral-100 transition-colors hover:bg-white/[0.12] hover:text-white"
                          )
                        }
                      >
                        Unstake
                      </Tab>
                    </Tab.List>
                  ) : null}
                  <Tab.Panels className="mt-4">
                    <Tab.Panel
                      key={FormType.STAKE}
                      className={classNames(
                        "flex flex-col gap-4 rounded-md",
                        "ring-white ring-opacity-60 ring-offset-2 ring-offset-neutral-400 focus:outline-none focus:ring-2"
                      )}
                    >
                      <div className="relative rounded-md border border-neutral-300 px-3 py-2 shadow-sm focus-within:border-neutral-600 focus-within:ring-1 focus-within:ring-neutral-600">
                        <label
                          htmlFor="stakeAmount"
                          className="block text-xs font-medium text-white"
                        >
                          Stake Amount
                        </label>
                        <input
                          name="stakeAmount"
                          id="stakeAmount"
                          className="block w-full border-0 bg-transparent p-0 text-white focus:ring-0 sm:text-sm"
                          onChange={(e) => setStakeAmount(e.target.value)}
                        />

                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                          <span className="text-white sm:text-sm" id="currency">
                            TNKR
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        className="inline-flex w-full justify-center rounded-md border border-transparent bg-amber-400 py-2 px-4 text-sm font-bold text-neutral-900 shadow-sm transition-colors hover:bg-amber-200 focus:outline-none focus:ring-2 focus:ring-neutral-500 focus:ring-offset-2"
                        onClick={handleStake}
                      >
                        Stake
                      </button>
                    </Tab.Panel>
                    <Tab.Panel
                      key={FormType.UNSTAKE}
                      className={classNames(
                        "flex flex-col gap-4 rounded-md",
                        "ring-white ring-opacity-60 ring-offset-2 ring-offset-neutral-400 focus:outline-none focus:ring-2"
                      )}
                    >
                      <div className="relative rounded-md border border-neutral-300 px-3 py-2 shadow-sm focus-within:border-neutral-600 focus-within:ring-1 focus-within:ring-neutral-600">
                        <label
                          htmlFor="unstakeAmount"
                          className="block text-xs font-medium text-white"
                        >
                          Unstake Amount
                        </label>
                        <input
                          type="text"
                          name="unstakeAmount"
                          id="unstakeAmount"
                          className="block w-full border-0 bg-transparent p-0 text-white focus:ring-0 sm:text-sm"
                          onChange={(e) => setUnstakeAmount(e.target.value)}
                        />

                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                          <span className="text-white sm:text-sm" id="currency">
                            TNKR
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        className="inline-flex w-full justify-center rounded-md border border-transparent bg-amber-400 py-2 px-4 text-sm font-bold text-neutral-900 shadow-sm transition-colors hover:bg-amber-200 focus:outline-none focus:ring-2 focus:ring-neutral-500 focus:ring-offset-2"
                        onClick={handleUnstake}
                      >
                        Unstake
                      </button>
                    </Tab.Panel>
                  </Tab.Panels>
                </Tab.Group>
              </div>
            </div>
          </div>
        </div>
      </Dialog.Panel>
    </Dialog>
  );
};

/*  */

export default ManageStaking;
