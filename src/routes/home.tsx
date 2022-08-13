import "@polkadot/api-augment";
import { ApiPromise, WsProvider } from "@polkadot/api";
import { web3Accounts, web3Enable } from "@polkadot/extension-dapp";
import { InjectedAccountWithMeta } from "@polkadot/extension-inject/types";
import { useEffect, useState } from "react";
import { BN, formatBalance } from "@polkadot/util";
import { Struct } from "@polkadot/types";
import BigNumber from "bignumber.js";

const RPC_PROVIDER = "wss://tinker.invarch.network/";

const TEST_WALLET = "i4zTcKHr38MbSUrhFLVKHG5iULhYttBVrqVon2rv6iWcxQwQQ";

type SystemAccount = Struct & {
  data: {
    free: BN;
    reserved: BN;
    miscFrozen: BN;
    feeFrozen: BN;
  };
};

type NavigationProps = {
  className: string;
  "aria-hidden": "true" | "false";
};

const navigation = [
  {
    name: "Twitter",
    href: "https://twitter.com/TinkerParachain",
    icon: (props: NavigationProps) => (
      <svg fill="currentColor" viewBox="0 0 24 24" {...props}>
        <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
      </svg>
    ),
  },
  {
    name: "GitHub",
    href: "https://github.com/InvArch",
    icon: (props: NavigationProps) => (
      <svg fill="currentColor" viewBox="0 0 24 24" {...props}>
        <path
          fillRule="evenodd"
          d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
          clipRule="evenodd"
        />
      </svg>
    ),
  },
  {
    name: "Medium",
    href: "https://github.com/InvArch",
    icon: (props: NavigationProps) => (
      <svg viewBox="0 0 20.24 11.38" fill="currentColor" {...props}>
        <path d="M11.42 5.69c0 3.14-2.56 5.69-5.71 5.69A5.691 5.691 0 0 1 0 5.69C0 2.55 2.56 0 5.71 0s5.7 2.54 5.71 5.69Zm6.26 0c0 2.96-1.28 5.36-2.85 5.36s-2.85-2.4-2.85-5.36S13.25.33 14.82.33s2.85 2.4 2.85 5.36Zm2.56 0c0 2.65-.45 4.8-1 4.8s-1-2.15-1-4.8.45-4.8 1-4.8 1 2.15 1 4.8Z" />
      </svg>
    ),
  },
];

const Home = () => {
  const [account, setAccount] = useState<InjectedAccountWithMeta | null>(null);
  const [vestingData, setVestingData] = useState<{
    vestedLocked: string;
    vestedClaimable: string;
    total: string;
    transferable: string;
  } | null>(null);

  const handleConnect = async () => {
    const extensions = await web3Enable("InvArch Tinker Network");

    if (extensions.length === 0) {
      return;
    }

    const allAccounts = await web3Accounts();

    if (allAccounts.length === 0) {
      return;
    }

    setAccount(allAccounts[0]);
  };

  const loadBalances = async ({ address }: InjectedAccountWithMeta) => {
    const wsProvider = new WsProvider(RPC_PROVIDER);

    const api = await ApiPromise.create({ provider: wsProvider });

    const results = await Promise.all([
      // vested locked
      api.query.balances.locks(address),
      // vesting schedules
      api.query.vesting.vestingSchedules(address),
      // current block
      api.query.system.number(),
      // total
      api.query.system.account<SystemAccount>(address),
    ]);

    const vestedLocked = new BigNumber(
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      results[0].find((lock) => lock.id.toHuman() === "ormlvest")?.amount || "0"
    );

    const vestingSchedules = results[1] as any;

    const currentBlock = results[2].toString();

    const sumFutureLock = vestingSchedules.reduce(
      (acc: any, vestingSchedule: any) => {
        const startPeriod = new BigNumber(vestingSchedule.start);

        const period = new BigNumber(vestingSchedule.period);

        // if the vesting has not started, number of periods is 0
        let numberOfPeriods = new BigNumber(currentBlock)
          .minus(startPeriod)
          .dividedBy(period);

        numberOfPeriods = numberOfPeriods.isNegative()
          ? new BigNumber("0")
          : numberOfPeriods;

        const perPeriod = new BigNumber(vestingSchedule.perPeriod);

        const vestedOverPeriods = numberOfPeriods.multipliedBy(perPeriod);

        const periodCount = new BigNumber(vestingSchedule.periodCount);

        const originalLock = periodCount.multipliedBy(perPeriod);

        const unlocked = vestedOverPeriods.gte(originalLock)
          ? originalLock
          : vestedOverPeriods;

        const futureLock = originalLock.minus(unlocked);

        return acc.plus(futureLock);
      },
      new BigNumber("0")
    );

    const vestedClaimable = vestedLocked.minus(sumFutureLock);

    const total = new BigNumber(results[3].data.free.toString());

    const transferable = total.minus(vestedLocked);

    setVestingData({
      vestedLocked: formatBalance(vestedLocked.toString(), {
        decimals: 12,
        withUnit: "TNKR",
        forceUnit: "-",
      }),
      vestedClaimable: formatBalance(vestedClaimable.toString(), {
        decimals: 12,
        withUnit: "TNKR",
        forceUnit: "-",
      }),
      total: formatBalance(total.toString(), {
        decimals: 12,
        withUnit: "TNKR",
        forceUnit: "-",
      }),
      transferable: formatBalance(transferable.toString(), {
        decimals: 12,
        withUnit: "TNKR",
        forceUnit: "-",
      }),
    });
  };

  const handleClaim = async () => {
    if (!account) return;

    const wsProvider = new WsProvider(RPC_PROVIDER);

    const api = await ApiPromise.create({ provider: wsProvider });

    await api.tx.vesting.claim();

    loadBalances(account);
  };

  useEffect(() => {
    if (!account) return;

    loadBalances(account);
  }, [account]);

  return (
    <>
      <nav className="bg-white shadow">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 justify-between">
            <div className="flex items-center">logo</div>
            <div className="flex items-center">
              {account ? (
                <>{account.address}</>
              ) : (
                <button onClick={handleConnect}>connect</button>
              )}
            </div>
            <div className="flex items-center">menu</div>
          </div>
        </div>
      </nav>
      <main className="flex h-[calc(100vh_-_12rem)] items-center justify-center bg-neutral-100">
        <div className="w-full py-6 px-8 sm:max-w-2xl">
          {vestingData ? (
            <div className="overflow-hidden rounded-lg bg-white shadow">
              <div className="bg-neutral-900 px-4 py-5 sm:px-6">
                <h3 className="text-center text-2xl font-bold text-white">
                  Total: {vestingData.total}
                </h3>
              </div>
              <div className="px-4 py-5 sm:grid sm:w-full sm:grid-cols-2 sm:px-6">
                <div className="flex flex-col p-6 text-center">
                  <span className="text-lg font-bold">Available</span>
                  <span className="text-2xl font-bold">
                    {vestingData.vestedClaimable}
                  </span>
                  <button
                    type="button"
                    className="mt-2 inline-flex items-center justify-center rounded-md border border-neutral-300 bg-white px-4 py-2 text-base font-medium text-neutral-700 shadow-sm hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-neutral-500 focus:ring-offset-2"
                    onClick={() => handleClaim()}
                  >
                    Claim Now
                  </button>
                </div>
                <div className="flex flex-col p-6 text-center">
                  <span className="text-lg font-bold">Vesting</span>
                  <span className="text-2xl font-bold">
                    {vestingData.vestedLocked}
                  </span>
                </div>
              </div>
              <div className="bg-neutral-900 px-4 py-5 sm:px-6">
                <h4 className="text-center text-lg font-bold leading-6 text-white">
                  Transferable: {vestingData.transferable}
                </h4>
              </div>
            </div>
          ) : null}
        </div>
      </main>
      <footer className="bg-white">
        <div className="mx-auto max-w-7xl py-12 px-4 sm:px-6 md:flex md:items-center md:justify-between lg:px-8">
          <div className="flex justify-center space-x-6 md:order-2">
            {navigation.map((item) => (
              <a
                key={item.name}
                href={item.href}
                className="text-neutral-400 hover:text-neutral-500"
                target="_blank"
                rel="noopener noreferrer"
              >
                <span className="sr-only">{item.name}</span>
                <item.icon className="h-6 w-6" aria-hidden="true" />
              </a>
            ))}
          </div>
          <div className="mt-8 md:order-1 md:mt-0">
            <p className="text-center text-base text-neutral-400">
              &copy; 2022 InvArch Tinkernet. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </>
  );
};

export default Home;
