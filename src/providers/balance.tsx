import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import BigNumber from 'bignumber.js';
import useApi from '../hooks/useApi';
import useAccount from '../stores/account';

interface BalanceContextType {
  availableBalance: BigNumber;
  reloadAccountInfo: () => void;
}

const BalanceContext = createContext<BalanceContextType>({
  availableBalance: new BigNumber(0),
  reloadAccountInfo: () => { },
});

export const BalanceProvider = ({ children }: { children: ReactNode; }) => {
  const [availableBalance, setAvailableBalance] = useState(new BigNumber(0));
  const api = useApi();
  const { selectedAccount } = useAccount();

  const loadAccountInfo = useCallback(async () => {
    if (!selectedAccount || !api) return;
    const account = await api.query.system.account(selectedAccount.address);
    const balance = account.toPrimitive() as { data: { free: string; }; };
    const locked = (await api.query.ocifStaking.ledger(selectedAccount.address)).toPrimitive() as { locked: string; };
    const currentBalance = new BigNumber(balance.data.free).minus(new BigNumber(locked.locked));

    setAvailableBalance(currentBalance);
  }, [api, selectedAccount]);

  useEffect(() => {
    loadAccountInfo();
  }, [selectedAccount, api, loadAccountInfo]);

  return (
    <BalanceContext.Provider value={{ availableBalance, reloadAccountInfo: loadAccountInfo }}>
      {children}
    </BalanceContext.Provider>
  );
};

export const useBalance = () => useContext(BalanceContext);