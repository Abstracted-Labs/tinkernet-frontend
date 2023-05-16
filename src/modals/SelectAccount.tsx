import { Dialog } from "@headlessui/react";
import {
  ArrowLeftOnRectangleIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";
import { InjectedAccountWithMeta } from "@polkadot/extension-inject/types";
import { shallow } from "zustand/shallow";

import useAccount from "../stores/account";
import useModal from "../stores/modals";

import { WalletConnectProvider } from "../stores/account";
import { useWallets } from '@polkadot-onboard/react';

import type { Account, BaseWallet, BaseWalletProvider } from '@polkadot-onboard/core';

const SelectWallet = ({ isOpen }: { isOpen: boolean }) => {
    const setOpenModal = useModal((state) => state.setOpenModal);

    const { wallets } = useWallets();
    console.log("wallets: ", wallets);

    const { selectedAccount, accounts, setSelectedAccount, setAccounts, wallet, setWallet } = useAccount(
        (state) => ({
            wallet: state.wallet,
            setWallet: state.setWallet,
            selectedAccount: state.selectedAccount,
            accounts: state.accounts,
            setAccounts: state.setAccounts,
            setSelectedAccount: state.setSelectedAccount,
        }),
        shallow
    );

    const handleAccountSelection = async (
        a: Account | null
    ) => {
    if (!a) {
        setSelectedAccount(null);
        setAccounts([]);

        if (wallet) {
            await wallet.disconnect();
        }
        setWallet(null);

        setOpenModal({ name: null });

        return;
    }

    setSelectedAccount(a);

    setOpenModal({ name: null });
  };

    const handleSelectWallet = async (w: BaseWallet) => {
        console.log("wallet chosen: ", w);
        await w.connect();

        setWallet(w);

        const accs = await w.getAccounts();

        console.log("accounts: ", accs)

        setAccounts(accs)
    }

    return (
        <Dialog open={isOpen} onClose={() => setOpenModal({ name: null })}>
        <Dialog.Overlay className="fixed inset-0 z-40 h-screen w-full bg-neutral-900/40 backdrop-blur-md" />

        <button className="pointer fixed top-0 right-0 z-50 flex cursor-pointer flex-col items-center justify-center bg-neutral-900 bg-transparent bg-opacity-50 p-6 text-gray-100 outline-none duration-500 hover:bg-opacity-100 hover:opacity-30">
        <XMarkIcon className="h-5 w-5" />
        <span className="block">close</span>
        </button>
        <Dialog.Panel>

        {wallets && !wallet ? (
<div className="fixed left-1/2 top-1/2 z-50 mx-auto block max-h-[calc(100%-2rem)] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 transform flex-col overflow-auto rounded-md border border-gray-50 bg-neutral-900 p-6 sm:w-full">
                    <h2 className="text-xl font-bold text-white">Select your Account</h2>
                    <ul className="w-full divide-y divide-gray-200">
                        {wallets.map((wallet) => (
                            <li
                                role="menuitem"
                                tabIndex={0}
                                key={wallet.metadata.id}
                                className="w-full cursor-pointer py-4 text-white transition-colors hover:text-amber-300"
                                onClick={() => {
                                    handleSelectWallet(wallet);
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                        handleSelectWallet(wallet);
                                    }
                                }}
                            >
                                <span className="block font-bold">{wallet.metadata.id}</span>
                            </li>
                        ))}
            </ul>
            </div>
        ) : null}

        {accounts && wallet ? (
            <div className="fixed left-1/2 top-1/2 z-50 mx-auto block max-h-[calc(100%-2rem)] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 transform flex-col overflow-auto rounded-md border border-gray-50 bg-neutral-900 p-6 sm:w-full">
                <h2 className="text-xl font-bold text-white">Select your Account</h2>
                <ul className="w-full divide-y divide-gray-200">
                    {accounts.map((account) => (
                        <li
                            role="menuitem"
                            tabIndex={0}
                            key={account.address}
                            className="w-full cursor-pointer py-4 text-white transition-colors hover:text-amber-300"
                            onClick={() => {
                                handleAccountSelection(account);
                            }}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                    handleAccountSelection(account);
                                }
                            }}
                        >
                            <span className="block font-bold">{account.name || ""}</span>
                            <span className="block overflow-hidden text-ellipsis text-sm">
                                {account.address}
                            </span>
                        </li>
                    ))}

                    {selectedAccount || wallet ? (
                        <li
                            role="menuitem"
                            tabIndex={0}
                            key={"9999"}
                            className="underline-offset-2w-full flex cursor-pointer items-center gap-2 overflow-hidden text-ellipsis py-4 text-white underline transition-colors hover:text-amber-300"
                            onClick={() => {
                                handleAccountSelection(null);
                            }}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                    handleAccountSelection(null);
                                }
                            }}
                        >
                            <ArrowLeftOnRectangleIcon className="h-5 w-5" />
                            Disconnect
                        </li>
                    ) : null}
                </ul>
            </div>
        ) : null}
            </Dialog.Panel>
        </Dialog>
    );
        };

export default SelectWallet;
