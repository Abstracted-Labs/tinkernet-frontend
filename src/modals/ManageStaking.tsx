import { Dialog, Tab } from "@headlessui/react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { zodResolver } from "@hookform/resolvers/zod";
import { web3Enable, web3FromAddress } from "@polkadot/extension-dapp";
import { ISubmittableResult } from "@polkadot/types/types";
import { formatBalance } from "@polkadot/util";
import BigNumber from "bignumber.js";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { z } from "zod";
import { shallow } from "zustand/shallow";

import useApi from "../hooks/useApi";
import useAccount from "../stores/account";
import useModal from "../stores/modals";
import classNames from "../utils/classNames";


const mode = {
  STAKE: "STAKE",
  UNSTAKE: "UNSTAKE",
} as const;

const schema = z.object({
  amount: z.string().refine((val) => !Number.isNaN(parseInt(val)), {
    message: "Amount must be a number",
  }),
});

const ManageStaking = ({ isOpen }: { isOpen: boolean }) => {
  const { setOpenModal, metadata } = useModal(
    (state) => ({
      setOpenModal: state.setOpenModal,
      metadata: state.metadata,
    }),
    shallow
  );
  const selectedAccount = useAccount((state) => state.selectedAccount);
    const wallet = useAccount((state) => state.wallet);
    const stakeForm = useForm<z.infer<typeof schema>>({
        resolver: zodResolver(schema),
        mode: "onBlur",
    });

  const unstakeForm = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    mode: "onBlur",
  });

  const api = useApi();

  const getSignAndSendCallback = () => {
    let hasFinished = false;

    return ({ status }: ISubmittableResult) => {
      if (hasFinished) {
        return;
      }

      if (status.isInvalid) {
        toast.dismiss();

        toast.error("Transaction is invalid");

        hasFinished = true;
      } else if (status.isReady) {
        toast.dismiss();

        toast.loading("Submitting transaction...");
      } else if (status.isDropped) {
        toast.dismiss();

        toast.error("Transaction dropped");

        hasFinished = true;
      } else if (status.isInBlock || status.isFinalized) {
        toast.dismiss();

        toast.success("Transaction submitted!");

        hasFinished = true;
      }
    };
  };

  const handleStake = stakeForm.handleSubmit(async ({ amount }) => {
    if (!selectedAccount) return;

    if (!metadata) throw new Error("METADATA_NOT_AVAILABLE");

    const parsedAmount = parseFloat(amount);

    if (Number.isNaN(parsedAmount)) {
      stakeForm.setError("amount", {
        type: "manual",
        message: "Amount must be a number",
      });

      return;
    }

    const maxValue = new BigNumber(metadata.availableBalance as string)
      .dividedBy(new BigNumber(10).pow(12))
      .toString();

    const minValue = new BigNumber(10);

    if (parsedAmount <= 0) {
      stakeForm.setError("amount", {
        type: "manual",
        message: "Amount must be greater than 0",
      });

      return;
    }

    if (
      new BigNumber(parsedAmount).isLessThan(minValue) &&
      (metadata?.totalUserStaked as BigNumber).toString() == "0"
    ) {
      stakeForm.setError("amount", {
        type: "manual",
        message: "Amount must be greater than or equal to 10",
      });

      return;
    }

    if (new BigNumber(parsedAmount).isGreaterThan(maxValue)) {
      stakeForm.setError("amount", {
        type: "manual",
        message: "Amount must be less than or equal to available balance",
      });

      return;
    }

    const parsedStakeAmount = new BigNumber(amount).multipliedBy(
      new BigNumber(10).pow(12)
    );

    toast.loading("Staking...");

      if (!wallet) return;

    const signer = wallet.signer;

    try {
      await api.tx.ocifStaking
        .stake(metadata.key, parsedStakeAmount.toString())
        .signAndSend(
          selectedAccount.address,
          { signer },
          getSignAndSendCallback()
        );

      setOpenModal({ name: null });
    } catch (e) {
      toast.dismiss();

      toast.error("Failed to stake");
    }
  });

  const handleUnstake = unstakeForm.handleSubmit(async ({ amount }) => {
    if (!selectedAccount) return;

    if (!metadata) throw new Error("METADATA_NOT_AVAILABLE");

    const parsedAmount = parseFloat(amount);

    const maxValue = new BigNumber(metadata.totalUserStaked as string)
      .dividedBy(new BigNumber(10).pow(12))
      .toString();

    if (parsedAmount <= 0) {
      unstakeForm.setError("amount", {
        type: "manual",
        message: "Amount must be greater than 0",
      });

      return;
    }

    if (new BigNumber(parsedAmount).isGreaterThan(maxValue)) {
      unstakeForm.setError("amount", {
        type: "manual",
        message: "Amount must be less than or equal to total staked",
      });

      return;
    }

    const parsedUnstakeAmount = new BigNumber(parsedAmount).multipliedBy(
      new BigNumber(10).pow(12)
    );

    toast.loading("Unstaking...");

      if (!wallet) return;

    const signer = wallet.signer;

    try {
      await api.tx.ocifStaking
        .unstake(metadata.key, parsedUnstakeAmount.toString())
        .signAndSend(
          selectedAccount.address,
          { signer },
          getSignAndSendCallback()
        );

      setOpenModal({ name: null });
    } catch (e) {
      toast.dismiss();

      toast.error("Failed to unstake");
    }
  });

  const handleStakeMax = () => {
    if (!metadata) throw new Error("METADATA_NOT_AVAILABLE");

    stakeForm.setValue(
      "amount",
      new BigNumber(metadata.availableBalance as string)
        .dividedBy(new BigNumber(10).pow(12))
        .toString()
    );

    stakeForm.trigger("amount", {
      shouldFocus: true,
    });
  };

  const handleUnstakeMax = () => {
    if (!metadata) throw new Error("METADATA_NOT_AVAILABLE");

    unstakeForm.setValue(
      "amount",
      new BigNumber(metadata.totalUserStaked as string)
        .dividedBy(new BigNumber(10).pow(12))
        .toString()
    );

    unstakeForm.trigger("amount", {
      shouldFocus: true,
    });
  };

  useEffect(() => {
    stakeForm.reset();
    unstakeForm.reset();
  }, [metadata?.key]);

  return (
    <Dialog open={isOpen} onClose={() => setOpenModal({ name: null })}>
      <Dialog.Overlay className="fixed inset-0 z-40 h-screen w-full bg-neutral-900/40 backdrop-blur-md" />

      <button className="pointer fixed top-0 right-0 z-50 flex cursor-pointer flex-col items-center justify-center bg-neutral-900 bg-transparent bg-opacity-50 p-6 text-gray-100 outline-none duration-500 hover:bg-opacity-100 hover:opacity-30">
        <XMarkIcon className="h-5 w-5" />
        <span className="block">close</span>
      </button>
      <Dialog.Panel>
        <div className="fixed left-1/2 top-1/2 z-50 mx-auto block max-h-[calc(100%-2rem)] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 transform flex-col overflow-auto rounded-md border border-gray-50 bg-neutral-900 p-6 sm:w-full">
          <h2 className="text-xl font-bold text-white">Manage Staking</h2>

          <div className="flex flex-col justify-between gap-4">
            <div className="mt-4 flex flex-col justify-between gap-4 sm:flex-auto">
              <div className="text-sm text-white">
                <>
                  Available:{" "}
                  <span className="font-bold">
                    {formatBalance(
                      metadata?.availableBalance
                        ? metadata?.availableBalance.toString()
                        : "0",
                      {
                        decimals: 12,
                        withUnit: false,
                        forceUnit: "-",
                      }
                    ).slice(0, -2) || "0"}{" "}
                    TNKR
                  </span>
                </>
              </div>

              {metadata?.totalUserStaked &&
              metadata?.totalUserStaked.toString() !== "0" ? (
                <div className="text-sm text-white">
                  <>
                    Staked:{" "}
                    <span className="font-bold">
                      {formatBalance(metadata?.totalUserStaked.toString(), {
                        decimals: 12,
                        withUnit: false,
                        forceUnit: "-",
                      }).slice(0, -2) || "0"}{" "}
                      TNKR
                    </span>
                  </>
                </div>
              ) : null}
            </div>

            <div className="flex flex-col gap-4">
              <Tab.Group>
                {metadata?.totalUserStaked &&
                metadata?.totalUserStaked.toString() !== "0" ? (
                  <Tab.List className="flex gap-6 space-x-1 rounded-md bg-neutral-900">
                    <Tab
                      key={mode.STAKE}
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
                      key={mode.UNSTAKE}
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
                <Tab.Panels>
                  <Tab.Panel
                    key={mode.STAKE}
                    className={classNames(
                      "flex flex-col gap-4 rounded-md",
                      "ring-white ring-opacity-60 ring-offset-2 ring-offset-neutral-400 focus:outline-none focus:ring-2"
                    )}
                  >
                    <form
                      className="flex flex-col gap-4"
                      onSubmit={handleStake}
                    >
                      <div className="relative rounded-md border border-neutral-300 px-3 py-2 shadow-sm focus-within:border-neutral-600 focus-within:ring-1 focus-within:ring-neutral-600">
                        <label
                          htmlFor="stakeAmount"
                          className="block text-xs font-medium text-white"
                        >
                          Stake Amount
                        </label>
                        <input
                          type="text"
                          {...stakeForm.register("amount", {
                            required: true,
                          })}
                          className="mt-2 block w-[calc(100%-6rem)] border-0 bg-transparent p-0 text-white focus:ring-transparent sm:text-sm"
                        />

                        <div className="absolute inset-y-0 right-0 flex items-center gap-4 pr-3">
                          <span
                            className="pointer-events-none block text-white sm:text-sm"
                            id="currency"
                          >
                            TNKR
                          </span>

                          <span
                            className="block cursor-pointer text-white sm:text-sm"
                            id="currency"
                            onClick={handleStakeMax}
                            tabIndex={0}
                          >
                            MAX
                          </span>
                        </div>
                      </div>

                      {stakeForm.formState.errors.amount ? (
                        <div className="text-red-400">
                          {stakeForm.formState.errors.amount.message}
                        </div>
                      ) : null}

                      <button
                        type="submit"
                        disabled={!stakeForm.formState.isValid}
                        className="inline-flex w-full justify-center rounded-md border border-transparent bg-amber-400 py-2 px-4 text-sm font-bold text-neutral-900 shadow-sm transition-colors hover:bg-amber-200 focus:outline-none focus:ring-2 focus:ring-neutral-500 focus:ring-offset-2 disabled:bg-neutral-400"
                      >
                        Stake
                      </button>
                    </form>
                  </Tab.Panel>
                  <Tab.Panel
                    key={mode.UNSTAKE}
                    className={classNames(
                      "rounded-md",
                      "ring-white ring-opacity-60 ring-offset-2 ring-offset-neutral-400 focus:outline-none focus:ring-2"
                    )}
                  >
                    <form
                      className="flex flex-col gap-4"
                      onSubmit={handleUnstake}
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
                          {...unstakeForm.register("amount", {
                            required: true,
                          })}
                          className="mt-2 block w-[calc(100%-6rem)] border-0 bg-transparent p-0 text-white focus:ring-0 sm:text-sm"
                        />

                        <div className="absolute inset-y-0 right-0 flex items-center gap-4 pr-3">
                          <span
                            className="pointer-events-none block text-white sm:text-sm"
                            id="currency"
                          >
                            TNKR
                          </span>

                          <span
                            className="block cursor-pointer text-white sm:text-sm"
                            id="currency"
                            onClick={handleUnstakeMax}
                            tabIndex={0}
                          >
                            MAX
                          </span>
                        </div>
                      </div>

                      {unstakeForm.formState.errors.amount ? (
                        <div className="text-red-400">
                          {unstakeForm.formState.errors.amount.message}
                        </div>
                      ) : null}

                      <button
                        type="submit"
                        disabled={!unstakeForm.formState.isValid}
                        className="inline-flex w-full justify-center rounded-md border border-transparent bg-amber-400 py-2 px-4 text-sm font-bold text-neutral-900 shadow-sm transition-colors hover:bg-amber-200 focus:outline-none focus:ring-2 focus:ring-neutral-500 focus:ring-offset-2 disabled:bg-neutral-400"
                      >
                        Unstake
                      </button>
                    </form>
                  </Tab.Panel>
                </Tab.Panels>
              </Tab.Group>
            </div>
          </div>
        </div>
      </Dialog.Panel>
    </Dialog>
  );
};

/*  */

export default ManageStaking;
