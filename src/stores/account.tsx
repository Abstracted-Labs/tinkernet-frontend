import { InjectedAccountWithMeta } from "@polkadot/extension-inject/types";
import create from "zustand";
import { persist } from "zustand/middleware";

type AccountState = {
  accounts: InjectedAccountWithMeta[];
  selectedAccount: InjectedAccountWithMeta | null;
  setAccounts: (accounts: InjectedAccountWithMeta[]) => void;
  setSelectedAccount: (account: InjectedAccountWithMeta | null) => void;
};

const useAccount = create<AccountState>()(
  persist(
    (set) => ({
      accounts: [],
      selectedAccount: null,
      setAccounts: (accounts: InjectedAccountWithMeta[]) =>
        set(() => ({ accounts })),
      setSelectedAccount: (account: InjectedAccountWithMeta | null) =>
        set(() => ({ selectedAccount: account })),
    }),
    {
      name: "account",
    }
  )
);

export default useAccount;