import { Dialog } from "@headlessui/react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { web3Enable, web3FromAddress } from "@polkadot/extension-dapp";
import { formatBalance } from "@polkadot/util";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import { shallow } from "zustand/shallow";

import useApi from "../hooks/useApi";
import useAccount from "../stores/account";
import useModal from "../stores/modals";
import getSignAndSendCallback from "../utils/getSignAndSendCallback";

const UnbondTokens = ({ isOpen }: { isOpen: boolean }) => {
  const { setOpenModal } = useModal(
    (state) => ({
      setOpenModal: state.setOpenModal,
    }),
    shallow
  );
  const [unbondingInfo, setUnbondingInfo] = useState<
    {
      amount: string;
      unlockIn: number;
    }[]
  >([]);
  const selectedAccount = useAccount((state) => state.selectedAccount);

  const api = useApi();

  const handleUnbond = async () => {
    if (!selectedAccount) return;

    toast.loading("Unbonding...");

    await web3Enable("Tinkernet");

    const injector = await web3FromAddress(selectedAccount.address);

    try {
      await api.tx.ocifStaking
        .withdrawUnstaked()
        .signAndSend(
          selectedAccount.address,
          { signer: injector.signer },
          getSignAndSendCallback({ onSuccess: () => loadUnbondingInfo() })
        );

      setOpenModal({ name: null });
    } catch (error) {
      toast.dismiss();

      toast.error(`${error}`);
    }
  };

  const loadUnbondingInfo = async () => {
    if (!selectedAccount) return;

    const ledger = (
      await api.query.ocifStaking.ledger(selectedAccount.address)
    ).toPrimitive() as {
      locked: number;
      unbondingInfo: {
        unlockingChunks: {
          amount: number;
          unlockEra: number;
        }[];
      };
    };

    const currentEra = (
      await api.query.ocifStaking.currentEra()
    ).toPrimitive() as number;

    const unbondingInfo = ledger.unbondingInfo.unlockingChunks.map(
      ({ amount, unlockEra }) => ({
        amount: `${
          formatBalance(amount.toString(), {
            decimals: 12,
            withUnit: false,
            forceUnit: "-",
          }).slice(0, -2) || "0"
        } TNKR
        `,
        unlockIn: unlockEra - currentEra,
      })
    );

    setUnbondingInfo(unbondingInfo);
  };

  useEffect(() => {
    if (!isOpen) return;

    loadUnbondingInfo();
  }, [isOpen]);

  return (
    <Dialog open={isOpen} onClose={() => setOpenModal({ name: null })}>
      <Dialog.Overlay className="fixed inset-0 z-40 h-screen w-full bg-neutral-900/40 backdrop-blur-md" />

      <button className="pointer fixed top-0 right-0 z-50 flex cursor-pointer flex-col items-center justify-center bg-neutral-900 bg-transparent bg-opacity-50 p-6 text-gray-100 outline-none duration-500 hover:bg-opacity-100 hover:opacity-30">
        <XMarkIcon className="h-5 w-5" />
        <span className="block">close</span>
      </button>
      <Dialog.Panel>
        <div className="fixed left-1/2 top-1/2 z-50 mx-auto block max-h-[calc(100%-2rem)] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 transform flex-col overflow-auto rounded-md border border-gray-50 bg-neutral-900 p-6 sm:w-full">
          <h2 className="text-xl font-bold text-white">TNKR Unbonding</h2>

          <div className="mt-4 flex flex-col justify-between gap-4">
            {unbondingInfo.map(({ amount, unlockIn }) => {
              if (unlockIn <= 0) {
                return (
                  <div className="text-white" key={`${amount}-${unlockIn}`}>
                    <span className="font-bold">{amount}</span> was unlocked
                  </div>
                );
              }

              return (
                <div className="text-white" key={`${amount}-${unlockIn}`}>
                  <span className="font-bold">{amount}</span> will unlock in{" "}
                  {unlockIn} eras
                </div>
              );
            })}

            <button
              onClick={handleUnbond}
              className="inline-flex w-full justify-center rounded-md border border-transparent bg-amber-400 py-2 px-4 text-sm font-bold text-neutral-900 shadow-sm transition-colors hover:bg-amber-200 focus:outline-none focus:ring-2 focus:ring-neutral-500 focus:ring-offset-2 disabled:bg-neutral-400"
              disabled={
                !unbondingInfo.find(
                  ({ unlockIn }) => parseInt(`${unlockIn}`) <= 0
                )
              }
            >
              Withdraw Unbonded
            </button>
          </div>
        </div>
      </Dialog.Panel>
    </Dialog>
  );
};

export default UnbondTokens;
