import { InjectedAccountWithMeta } from "@polkadot/extension-inject/types";
import { createWithEqualityFn } from "zustand/traditional";
import { persist } from "zustand/middleware";

type AccountState = {
  accounts: InjectedAccountWithMeta[];
  selectedAccount: InjectedAccountWithMeta | null;
  setAccounts: (accounts: InjectedAccountWithMeta[]) => void;
  setSelectedAccount: (account: InjectedAccountWithMeta | null) => void;
};

const useAccount = createWithEqualityFn<AccountState>()(
  persist(
    (set) => ({
      accounts: [],
      selectedAccount: null,
      setAccounts: (accounts) => set(() => ({ accounts })),
      setSelectedAccount: (account) =>
        set(() => ({ selectedAccount: account })),
    }),
    {
      name: "account",
    }
  )
);

export default useAccount;
