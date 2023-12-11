import { Dialog, Tab } from "@headlessui/react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { zodResolver } from "@hookform/resolvers/zod";
import { web3Enable, web3FromAddress } from "@polkadot/extension-dapp";
import { formatBalance } from "@polkadot/util";
import BigNumber from "bignumber.js";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { z } from "zod";
import { shallow } from "zustand/shallow";
import getSignAndSendCallback from "../utils/getSignAndSendCallback";
import useApi from "../hooks/useApi";
import useAccount from "../stores/account";
import useModal from "../stores/modals";
import classNames from "../utils/classNames";
import Input from "../components/Input";
import Button from "../components/Button";
import { StakingCore, TotalUserStakedData } from "../routes/staking";
import Dropdown from "../components/Dropdown";

const mode = {
  STAKE: "STAKE",
  UNSTAKE: "UNSTAKE",
} as const;

const schema = z.object({
  amount: z.string().refine((val) => !Number.isNaN(parseInt(val)), {
    message: "Amount must be a number",
  }),
});

const ManageStaking = (props: { isOpen: boolean; }) => {
  const { isOpen } = props;
  const [stakingCores, setStakingCores] = useState<StakingCore[]>([]);
  const [totalUserStakedData, setTotalUserStakedData] = useState<TotalUserStakedData>({});
  const [coreName, setCoreName] = useState<string | undefined>();
  const { setOpenModal, metadata } = useModal(
    (state) => ({
      setOpenModal: state.setOpenModal,
      metadata: state.metadata,
    }),
    shallow
  );
  const selectedAccount = useAccount((state) => state.selectedAccount);
  const stakeForm = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    mode: "onBlur",
  });
  const unstakeForm = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    mode: "onBlur",
  });
  const api = useApi();
  const watchedUnstakeAmount = unstakeForm.watch('amount');
  const watchedStakeAmount = stakeForm.watch('amount');

  const handleStake = stakeForm.handleSubmit(async ({ amount }) => {
    if (!selectedAccount) return;

    if (!metadata) throw new Error("METADATA_NOT_AVAILABLE");

    const parsedAmount = parseFloat(amount);

    if (Number.isNaN(parsedAmount)) {
      stakeForm.setError("amount", {
        type: "valueAsNumber",
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
        type: "min",
        message: "Amount must be greater than 0",
      });

      return;
    }

    if (
      new BigNumber(parsedAmount).isLessThan(minValue) &&
      (metadata?.totalUserStaked as BigNumber).toString() == "0"
    ) {
      stakeForm.setError("amount", {
        type: "min",
        message: "Amount must be greater than or equal to 10",
      });

      return;
    }

    if (new BigNumber(parsedAmount).isGreaterThan(maxValue)) {
      stakeForm.setError("amount", {
        type: "max",
        message: "Amount must be less than or equal to available balance",
      });

      return;
    }

    const parsedStakeAmount = new BigNumber(amount).multipliedBy(
      new BigNumber(10).pow(12)
    );

    toast.loading("Staking...");

    await web3Enable("Tinkernet");

    const injector = await web3FromAddress(selectedAccount.address);

    try {
      await api.tx.ocifStaking
        .stake(metadata.key, parsedStakeAmount.toString())
        .signAndSend(
          selectedAccount.address,
          { signer: injector.signer },
          getSignAndSendCallback({
            onInvalid: () => {
              toast.dismiss();

              toast.error("Invalid transaction");
            },
            onExecuted: () => {
              toast.dismiss();

              toast.loading("Waiting for confirmation...");
            },
            onSuccess: () => {
              toast.dismiss();

              toast.success("Staked successfully");
            },
            onDropped: () => {
              toast.dismiss();

              toast.error("Transaction dropped");
            },
          })
        );

      setOpenModal({ name: null });
    } catch (error) {
      toast.dismiss();

      toast.error(`${ error }`);
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
        type: "min",
        message: "Amount must be greater than 0",
      });

      return;
    }

    if (new BigNumber(parsedAmount).isGreaterThan(maxValue)) {
      unstakeForm.setError("amount", {
        type: "max",
        message: "Amount must be less than or equal to total staked",
      });

      return;
    }

    const parsedUnstakeAmount = new BigNumber(parsedAmount).multipliedBy(
      new BigNumber(10).pow(12)
    );

    toast.loading("Unstaking...");

    await web3Enable("Tinkernet");

    const injector = await web3FromAddress(selectedAccount.address);

    try {
      await api.tx.ocifStaking
        .unstake(metadata.key, parsedUnstakeAmount.toString())
        .signAndSend(
          selectedAccount.address,
          { signer: injector.signer },
          getSignAndSendCallback({
            onInvalid: () => {
              toast.dismiss();

              toast.error("Invalid transaction");
            },
            onExecuted: () => {
              toast.dismiss();

              toast.loading("Waiting for confirmation...");
            },
            onSuccess: () => {
              toast.dismiss();

              toast.success("Unstaked successfully");
            },
            onDropped: () => {
              toast.dismiss();

              toast.error("Transaction dropped");
            },
          })
        );

      setOpenModal({ name: null });
    } catch (error) {
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

  const handleTabChange = (index: number) => {
    if (index === 0) {
      stakeForm.reset();
      return;
    }

    unstakeForm.reset();
  };

  useEffect(() => {
    if (!metadata) return;
    if ('stakingCores' in metadata) {
      setStakingCores(metadata.stakingCores as StakingCore[]);
    }
    if ('totalUserStakedData' in metadata) {
      setTotalUserStakedData(metadata.totalUserStakedData as TotalUserStakedData);
    }
    if ('metadata' in metadata) {
      const name = (metadata.metadata as { name: string; })?.name || '';
      setCoreName(name);
    }
  }, [metadata]);

  useEffect(() => {
    stakeForm.reset();
    unstakeForm.reset();
  }, [metadata?.key]);

  const RestakingDropdown = () => {
    const list = stakingCores.map(core => ({ id: core.key, userStaked: totalUserStakedData[core.key], name: core.metadata.name }));
    if (!list || list.length === 0) return null;

    // Filter the active coreName
    const inactiveCores = list.filter(item => item.name !== coreName);

    return <Dropdown list={inactiveCores} onSelect={() => { }} />;
  };

  return (
    <Dialog open={isOpen} onClose={() => setOpenModal({ name: null })}>
      <Dialog.Overlay className="fixed inset-0 z-40 h-screen w-full bg-neutral-900/40 backdrop-blur-md" />

      <button className="pointer fixed top-0 right-0 z-50 flex cursor-pointer flex-col items-center justify-center bg-neutral-900 bg-transparent bg-opacity-50 p-6 text-gray-100 outline-none duration-500 hover:bg-opacity-100 hover:opacity-30">
        <XMarkIcon className="h-5 w-5" />
        <span className="block">Close</span>
      </button>
      <Dialog.Panel>
        <>
          <div className="fixed left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 flex flex-col w-[350px] md:w-[530px] h-[430px] md:h-[380px] bg-tinkerDarkGrey rounded-xl space-y-4 p-8">
            <h2 className="text-md font-bold text-white  bg-tinkerDarkGrey w-[calc(100%-2rem)] max-w-lg truncate">Manage Staking for {coreName}</h2>

            <div className="flex flex-col justify-between gap-4">
              <div className="flex flex-row justify-around gap-4 sm:flex-auto mb-4">
                <div className="text-sm text-white text-center">
                  <div className="font-bold">
                    {formatBalance(
                      metadata?.availableBalance
                        ? metadata.availableBalance.toString()
                        : "0",
                      {
                        decimals: 12,
                        withUnit: false,
                        forceUnit: "-",
                      }
                    ).slice(0, -2) || "0"}{" "}
                    TNKR
                  </div>
                  <div className="text-xxs/none">Available Balance</div>
                </div>

                {metadata?.totalUserStaked &&
                  metadata?.totalUserStaked.toString() !== "0" ? (
                  <div className="text-sm text-white text-center">
                    <div className="font-bold">
                      {formatBalance(metadata.totalUserStaked.toString(), {
                        decimals: 12,
                        withUnit: false,
                        forceUnit: "-",
                      }).slice(0, -2) || "0"}{" "}
                      TNKR
                    </div>
                    <div className="text-xxs/none">Currently Staked</div>
                  </div>
                ) : null}
              </div>

              <div className="flex flex-col gap-4">
                <Tab.Group onChange={handleTabChange}>
                  {metadata?.totalUserStaked &&
                    metadata?.totalUserStaked.toString() !== "0" ? (
                    <Tab.List className="flex gap-3 space-x-1 rounded-md bg-neutral-900">
                      <Tab
                        key={mode.STAKE}
                        className={({ selected }) =>
                          classNames(
                            "w-full rounded-md py-2.5 text-sm font-medium leading-5 text-neutral-700 focus:outline-none",
                            selected
                              ? "bg-white shadow border-2 border-tinkerYellow"
                              : "border-2 border-white/[0.12] bg-neutral-900 text-neutral-100 transition-colors hover:bg-white/[0.12] hover:text-white"
                          )
                        }
                      >
                        Stake More
                      </Tab>
                      <Tab
                        key={mode.UNSTAKE}
                        className={({ selected }) =>
                          classNames(
                            "w-full rounded-md py-2.5 text-sm font-medium leading-5 text-neutral-700 focus:outline-none",
                            selected
                              ? "bg-white shadow border-2 border-tinkerYellow"
                              : "border-2 border-white/[0.12] bg-neutral-900 text-neutral-100 transition-colors hover:bg-white/[0.12] hover:text-white"
                          )
                        }
                      >
                        Stake Less
                      </Tab>
                    </Tab.List>
                  ) : null}
                  <Tab.Panels>
                    <Tab.Panel
                      key={mode.STAKE}
                      className={classNames(
                        "flex flex-col gap-4 rounded-md",
                        "focus:outline-none"
                      )}
                    >
                      <form
                        className="flex flex-col items-between gap-4"
                        onSubmit={handleStake}
                      >
                        <div className="flex flex-col md:flex-row gap-4 items-between justify-center">
                          <div className="flex-grow">
                            <div className="block text-xxs font-medium text-white mb-1">Transfer Funds From</div>
                            <RestakingDropdown />
                          </div>
                          <div className="flex-grow">
                            <label
                              htmlFor="stakeAmount"
                              className="block text-xxs font-medium text-white mb-1"
                            >Stake Amount</label>
                            <div className="relative flex flex-row items-center">
                              <Input {...stakeForm.register("amount", {
                                required: true,
                              })} type="text" id="stakeAmount"
                              />
                              <div className="absolute inset-y-0 right-0 flex flex-row items-center gap-4 transform -translate-x-1/2">
                                <span
                                  className="block cursor-pointer text-white hover:text-tinkerYellow text-xs focus:outline-none"
                                  onClick={handleStakeMax}
                                  tabIndex={0}
                                >
                                  MAX
                                </span>
                              </div>
                            </div>
                            {stakeForm.formState.errors.amount ? (
                              <p className="text-xs text-red-400 mt-1">{stakeForm.formState.errors.amount.message}
                              </p>
                            ) : null}
                          </div>
                        </div>

                        <Button mini variant="primary" type="submit" disabled={!stakeForm.formState.isValid}>
                          Stake {watchedStakeAmount} TNKR
                        </Button>
                      </form>
                    </Tab.Panel>
                    <Tab.Panel
                      key={mode.UNSTAKE}
                      className={classNames(
                        "rounded-md",
                        "focus:outline-none"
                      )}
                    >
                      <form
                        className="flex flex-col items-between gap-4"
                        onSubmit={handleUnstake}
                      >
                        <div>
                          <label
                            htmlFor="stakeAmount"
                            className="block text-xxs font-medium text-white mb-1"
                          >Unstake Amount</label>
                          <div className="relative flex flex-row items-center">
                            <Input {...unstakeForm.register("amount", {
                              required: true,
                            })} type="text" id="unstakeAmount"
                            />
                            <div className="absolute inset-y-0 right-0 flex flex-row items-center gap-4 transform -translate-x-1/2">
                              <span
                                className="block cursor-pointer text-white hover:text-tinkerYellow text-xs focus:outline-none"
                                onClick={handleUnstakeMax}
                                tabIndex={0}
                              >
                                MAX
                              </span>
                            </div>
                          </div>
                          {unstakeForm.formState.errors.amount ? (
                            <p className="text-xs text-red-400 mt-1">{unstakeForm.formState.errors.amount.message}
                            </p>
                          ) : null}
                        </div>

                        <Button mini variant="primary" type="submit" disabled={!unstakeForm.formState.isValid}>
                          Unstake {watchedUnstakeAmount} TNKR
                        </Button>
                      </form>
                    </Tab.Panel>
                  </Tab.Panels>
                </Tab.Group>
              </div>
            </div>
          </div>
          <div className="fixed left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 z-[49] w-[370px] md:w-[550px] h-[450px] md:h-[400px] rounded-xl border-[30px] border-tinkerGrey border-opacity-50" />
        </>
      </Dialog.Panel>
    </Dialog >
  );
};

export default ManageStaking;
