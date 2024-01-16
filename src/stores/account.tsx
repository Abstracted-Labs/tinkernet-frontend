import { InjectedAccountWithMeta } from "@polkadot/extension-inject/types";
import { createWithEqualityFn } from 'zustand/traditional';
import { persist } from "zustand/middleware";

type AccountState = {
  accounts: InjectedAccountWithMeta[];
  extensions: string[];
  selectedAccount: InjectedAccountWithMeta | null;
  setAccounts: (accounts: InjectedAccountWithMeta[]) => void;
  setExtensions: (extensions: string[]) => void;
  setSelectedAccount: (account: InjectedAccountWithMeta | null) => void;
};

const useAccount = createWithEqualityFn<AccountState>()(
  persist(
    (set) => ({
      accounts: [],
      extensions: [],
      selectedAccount: null,
      setAccounts: (accounts: InjectedAccountWithMeta[]) => set(() => ({ accounts })),
      setExtensions: (extensions: string[]) => set(() => ({ extensions })),
      setSelectedAccount: (account: InjectedAccountWithMeta | null) =>
        set(() => ({ selectedAccount: account })),
    }),
    {
      name: "account",
    }
  )
);

export default useAccount;
