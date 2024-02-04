import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import BigNumber from 'bignumber.js';
import useApi from '../hooks/useApi';
import useAccount from '../stores/account';

interface BalanceContextType {
  availableBalance: BigNumber;
  totalBalance: BigNumber;
  reloadAccountInfo: () => void;
}

const BalanceContext = createContext<BalanceContextType>({
  availableBalance: new BigNumber(0),
  totalBalance: new BigNumber(0),
  reloadAccountInfo: () => { },
});

export const BalanceProvider = ({ children }: { children: ReactNode; }) => {
  const [availableBalance, setAvailableBalance] = useState(new BigNumber(0));
  const [totalBalance, setTotalBalance] = useState(new BigNumber(0));
  const api = useApi();
  const { selectedAccount } = useAccount();

  const loadAccountInfo = useCallback(async () => {
    if (!selectedAccount || !api) return;
    const account = await api.query.system.account(selectedAccount.address);
    const balance = account.toPrimitive() as { data: { free: string; }; };
    const locked = (await api.query.ocifStaking.ledger(selectedAccount.address)).toPrimitive() as { locked: string; };
    const currentAvailableBalance = new BigNumber(balance.data.free).minus(new BigNumber(locked.locked));
    const currentTotalBalance = new BigNumber(balance.data.free);

    setAvailableBalance(currentAvailableBalance);
    setTotalBalance(currentTotalBalance);
  }, [api, selectedAccount]);

  useEffect(() => {
    loadAccountInfo();
  }, [selectedAccount, api, loadAccountInfo]);

  return (
    <BalanceContext.Provider value={{ availableBalance, totalBalance, reloadAccountInfo: loadAccountInfo }}>
      {children}
    </BalanceContext.Provider>
  );
};

export const useBalance = () => useContext(BalanceContext);