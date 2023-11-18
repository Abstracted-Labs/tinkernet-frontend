import { web3Enable, web3FromAddress } from "@polkadot/extension-dapp";
import { InjectedAccountWithMeta } from "@polkadot/extension-inject/types";
import { formatBalance } from "@polkadot/util";
import { encodeAddress } from "@polkadot/util-crypto";
import BigNumber from "bignumber.js";
import { useEffect, useRef, useState } from "react";
import { toast } from "react-hot-toast";
import LoadingSpinner from "../components/LoadingSpinner";
import useApi from "../hooks/useApi";
import useAccount from "../stores/account";
import useModal, { modalName } from "../stores/modals";
import { useQuery, useSubscription } from "urql";
import { Codec } from "@polkadot/types/types";
import { UserGroupIcon, LockClosedIcon } from "@heroicons/react/24/outline";
import getSignAndSendCallback from "../utils/getSignAndSendCallback";
import { UnsubscribePromise } from "@polkadot/api/types";
import { StakesInfo } from "./claim";

const TotalRewardsClaimedQuery = `
  query totalRewardsClaimed($accountId: String!) {
    stakers(where: {account_eq: $accountId}) {
      latestClaimBlock
      totalRewards
    }
  }
`;

const TotalRewardsClaimedSubscription = `
  subscription totalRewardsClaimed($accountId: String!) {
    stakers(where: {account_eq: $accountId}) {
      latestClaimBlock
      totalRewards
    }
  }
`;

type StakingCore = {
  key: number;
  account: string;
  metadata: {
    name: string;
    description: string;
    image: string;
  };
};

type BalanceType = {
  nonce: string;
  consumers: string;
  providers: string;
  sufficients: string;
  data: {
    free: string;
    reserved: string;
    frozen: string;
  };
};

type CoreEraStakedInfoType = {
  coreId: number;
  account: string;
  total: string;
  numberOfStakers: number;
  rewardClaimed: boolean;
  active: boolean;
};

type CoreEraStakeType = {
  total: string;
  numberOfStakers: number;
  rewardClaimed: boolean;
  active: boolean;
};

type LedgerType = {
  locked: number;
  unbondingInfo: {
    unlockingChunks: {
      amount: number;
      unlockEra: number;
    }[];
  };
};

type LockedType = { locked: string; };

type StakedType = { staked: string; };

type CorePrimitiveType = {
  account: string;
  metadata: {
    name: string;
    description: string;
    image: string;
  };
};

type ReturnResultType = {
  nonce: string;
  consumers: string;
  providers: string;
  sufficients: string;
  data: {
    free: string;
    reserved: string;
    frozen: string;
  };
};

const Staking = () => {
  const descriptionRef = useRef<HTMLDivElement | null>(null);
  const setOpenModal = useModal((state) => state.setOpenModal);
  const selectedAccount = useAccount((state) => state.selectedAccount);
  const api = useApi();
  const [hasUnbondedTokens, setHasUnbondedTokens] = useState(false);
  const [stakingCores, setStakingCores] = useState<StakingCore[]>([]);
  const [currentStakingEra, setCurrentStakingEra] = useState<number>(0);
  const [coreEraStakeInfo, setCoreEraStakeInfo] = useState<
    {
      coreId: number;
      account: string;
      total: string;
      numberOfStakers: number;
      rewardClaimed: boolean;
      active: boolean;
    }[]
  >([]);
  const [totalUserStaked, setTotalUserStaked] = useState<BigNumber>();
  const [totalStaked, setTotalStaked] = useState<BigNumber>();
  const [userStakedInfo, setUserStakedInfo] = useState<
    {
      coreId: number;
      era: number;
      staked: BigNumber;
    }[]
  >([]);
  const [totalSupply, setTotalSupply] = useState<BigNumber>();
  const [unclaimedEras, setUnclaimedEras] = useState<{
    cores: { coreId: number; earliestEra: number; }[];
    total: number;
  }>({ cores: [], total: 0 });
  const [availableBalance, setAvailableBalance] = useState<BigNumber>();
  const [isLoading, setLoading] = useState(false);
  const [isWaiting, setWaiting] = useState(false);
  const [expandedCore, setExpandedCore] = useState<string | null>(null);
  const [totalClaimed, setTotalClaimed] = useState<BigNumber>(new BigNumber(0));
  const [chainProperties, setChainProperties] = useState<{
    maxStakersPerCore: number;
    inflationErasPerYear: number;
  }>();
  const [currentBlock, setCurrentBlock] = useState<number>(0);
  const [nextEraBlock, setNextEraBlock] = useState<number>(0);
  const [blocksPerEra, setBlocksPerEra] = useState<number>(0);

  const [rewardsClaimedQuery] = useQuery({
    query: TotalRewardsClaimedQuery,
    variables: {
      accountId: selectedAccount
        ? encodeAddress(selectedAccount.address, 2)
        : null,
    },

    pause: !selectedAccount,
  });

  useSubscription(
    {
      query: TotalRewardsClaimedSubscription,
      variables: {
        accountId: selectedAccount
          ? encodeAddress(selectedAccount.address, 2)
          : null,
      },
      pause: !selectedAccount,
    },
    (
      _: unknown,
      result: { stakers: { latestClaimBlock: number; totalRewards: string; }[]; }
    ) => {
      if (result.stakers.length === 0) return;

      if (!result.stakers[0].totalRewards) return;

      const totalClaimed = new BigNumber(result.stakers[0].totalRewards);

      setTotalClaimed(totalClaimed);
    }
  );

  const setupSubscriptions = ({
    selectedAccount,
  }: {
    selectedAccount: InjectedAccountWithMeta;
  }) => {
    // Current block subscription
    const blocks = api.rpc.chain.subscribeNewHeads((header) => {
      setCurrentBlock(header.number.toNumber());
    });

    // Next era starting block subscription
    const nextEraStartingBlock = api.query.ocifStaking.nextEraStartingBlock(
      (blockNumber: Codec) => {
        setNextEraBlock(blockNumber.toPrimitive() as number);
      }
    );

    let generalEraInfo;

    if (currentStakingEra > 0) {
      generalEraInfo = api.query.ocifStaking.generalEraInfo(
        currentStakingEra,
        (c: Codec) => {
          const stakingInfo = c.toPrimitive() as StakedType;

          setTotalStaked(new BigNumber(stakingInfo.staked));
        }
      );
    }

    // Staking current era subscription
    const currentEra = api.query.ocifStaking.currentEra((era: Codec) => {
      setCurrentStakingEra(era.toPrimitive() as number);
    });

    const account = api.query.system.account(
      selectedAccount.address,
      async (account) => {
        const balance = account.toPrimitive() as BalanceType;

        const locked = (
          await api.query.ocifStaking.ledger(selectedAccount.address)
        ).toPrimitive() as LockedType;

        setAvailableBalance(
          new BigNumber(balance.data.free).minus(new BigNumber(locked.locked))
        );
      }
    );

    const unsubs = [blocks, nextEraStartingBlock, currentEra, account];

    if (generalEraInfo) {
      unsubs.push(generalEraInfo);
    }

    // Core era stake + Use era stake subscriptions
    const coreEraStakeInfoMap: Map<
      number, CoreEraStakedInfoType> = new Map();

    const userStakedInfoMap: Map<
      number,
      {
        coreId: number;
        era: number;
        staked: BigNumber;
      }
    > = new Map();

    for (const stakingCore of stakingCores) {
      api.query.ocifStaking.coreEraStake(
        stakingCore.key,
        currentStakingEra,
        (c: Codec) => {
          const coreEraStake = c.toPrimitive() as CoreEraStakeType;

          coreEraStakeInfoMap.set(stakingCore.key, {
            coreId: stakingCore.key,
            account: stakingCore.account,
            ...coreEraStake,
          });

          if (Array.from(coreEraStakeInfoMap.values()).length > 0) {
            setCoreEraStakeInfo(Array.from(coreEraStakeInfoMap.values()));
          }
        }
      );

      api.query.ocifStaking.ledger(selectedAccount.address, (c: Codec) => {
        const ledger = c.toPrimitive() as LedgerType;

        setHasUnbondedTokens(ledger.unbondingInfo.unlockingChunks.length > 0);
      });

      api.query.ocifStaking.generalStakerInfo(
        stakingCore.key,
        selectedAccount.address,
        (generalStakerInfo: Codec) => {
          const info = generalStakerInfo.toPrimitive() as StakesInfo;

          if (info.stakes.length > 0) {
            const unclaimedEarliest = info.stakes.reduce((p, v) => p.era < v.era ? p : v).era;

            if (parseInt(unclaimedEarliest) < currentStakingEra) {
              const unclaimed = unclaimedEras;

              const cores = unclaimed.cores.filter((value) => {
                return value.coreId != stakingCore.key;
              });

              cores.push({
                coreId: stakingCore.key,
                earliestEra: parseInt(unclaimedEarliest),
              });

              let total = unclaimed.total;

              if (currentStakingEra - parseInt(unclaimedEarliest) > total) {
                total = currentStakingEra - parseInt(unclaimedEarliest);
              }

              setUnclaimedEras({
                cores,
                total: unclaimed.total,
              });
            } else {
              setUnclaimedEras((unclaimedEras) => ({
                ...unclaimedEras,
                total: 0,
              }));
            }

            const latestInfo = info.stakes.at(-1);

            if (!latestInfo) {
              return;
            }

            userStakedInfoMap.set(stakingCore.key, {
              coreId: stakingCore.key,
              era: parseInt(latestInfo.era),
              staked: new BigNumber(latestInfo.staked),
            });

            if (Array.from(userStakedInfoMap.values()).length != 0) {
              setUserStakedInfo(Array.from(userStakedInfoMap.values()));

              const newTotalStaked = Array.from(
                userStakedInfoMap.values()
              ).reduce((acc, cur) => acc.plus(cur.staked), new BigNumber(0));

              setTotalUserStaked(newTotalStaked);
            }
          }
        }
      );
    }

    return unsubs as UnsubscribePromise[];
  };

  const loadStakingCores = async (
    selectedAccount: InjectedAccountWithMeta | null
  ) => {
    setLoading(true);
    try {
      toast.loading("Loading staking cores...");

      const blocksPerEra =
        api.consts.ocifStaking.blocksPerEra.toPrimitive() as number;

      setBlocksPerEra(blocksPerEra);

      const maxStakersPerCore =
        api.consts.ocifStaking.maxStakersPerCore.toPrimitive() as number;

      const inflationErasPerYear =
        api.consts.checkedInflation.erasPerYear.toPrimitive() as number;

      setCurrentBlock(
        (await api.rpc.chain.getBlock()).block.header.number.toNumber()
      );

      setNextEraBlock(
        (
          await api.query.ocifStaking.nextEraStartingBlock()
        ).toPrimitive() as number
      );

      const currentStakingEra = (
        await api.query.ocifStaking.currentEra()
      ).toPrimitive() as number;

      setCurrentStakingEra(currentStakingEra);

      const generalEraInfo = (
        await api.query.ocifStaking.generalEraInfo(currentStakingEra)
      ).toPrimitive() as StakedType;

      setTotalStaked(new BigNumber(generalEraInfo.staked));

      const supply = (
        await api.query.balances.totalIssuance()
      ).toPrimitive() as string;

      setTotalSupply(new BigNumber(supply));

      setChainProperties({
        maxStakersPerCore,
        inflationErasPerYear,
      });

      const stakingCores = (
        await api.query.ocifStaking.registeredCore.entries()
      ).map(
        ([
          {
            args: [key],
          },
          core,
        ]) => {
          const c = core.toPrimitive() as CorePrimitiveType;

          const primitiveKey = key.toPrimitive() as number;

          return {
            key: primitiveKey,
            ...c,
          };
        }
      );

      setStakingCores(stakingCores);

      const coreEraStakeInfo: CoreEraStakedInfoType[] = [];

      for (const stakingCore of stakingCores) {
        const coreEraStake = (
          await api.query.ocifStaking.coreEraStake(
            stakingCore.key,
            currentStakingEra
          )
        ).toPrimitive() as CoreEraStakeType;

        coreEraStakeInfo.push({
          coreId: stakingCore.key,
          account: stakingCore.account,
          ...coreEraStake,
        });
      }

      setCoreEraStakeInfo(coreEraStakeInfo);

      if (selectedAccount) {
        const results = await Promise.all([
          api.query.system.account(selectedAccount.address),
          api.query.ocifStaking.ledger(selectedAccount.address),
        ]);

        const balance = results[0].toPrimitive() as ReturnResultType;

        const locked = results[1].toPrimitive() as {
          locked: string;
        };

        setAvailableBalance(
          new BigNumber(balance.data.free).minus(new BigNumber(locked.locked))
        );

        const userStakedInfo: {
          coreId: number;
          era: number;
          staked: BigNumber;
        }[] = [];

        let newUnclaimedCores: {
          cores: { coreId: number; earliestEra: number; }[];
          total: number;
        } = { cores: [], total: 0 };

        for (const stakingCore of stakingCores) {
          const generalStakerInfo =
            await api.query.ocifStaking.generalStakerInfo(
              stakingCore.key,
              selectedAccount.address
            );

          const info = generalStakerInfo.toPrimitive() as StakesInfo;

          if (info.stakes.length > 0) {
            const unclaimedEarliest = info.stakes[0].era;

            if (parseInt(unclaimedEarliest) < currentStakingEra) {
              const cores = newUnclaimedCores.cores.filter((value) => {
                return value.coreId != stakingCore.key;
              });

              cores.push({
                coreId: stakingCore.key,
                earliestEra: parseInt(unclaimedEarliest),
              });

              let total = newUnclaimedCores.total;

              if (currentStakingEra - parseInt(unclaimedEarliest) > total) {
                total = currentStakingEra - parseInt(unclaimedEarliest);
              }

              newUnclaimedCores = { cores, total };
            }

            const latestInfo = info.stakes.at(-1);

            if (!latestInfo) {
              continue;
            }

            userStakedInfo.push({
              coreId: stakingCore.key,
              era: parseInt(latestInfo.era),
              staked: new BigNumber(latestInfo.staked),
            });
          }
        }

        setUnclaimedEras(newUnclaimedCores);

        setUserStakedInfo(userStakedInfo);

        const totalUserStaked = userStakedInfo.reduce(
          (acc, cur) => acc.plus(cur.staked),
          new BigNumber(0)
        );

        setTotalUserStaked(totalUserStaked);

        setHasUnbondedTokens(
          (
            (
              await api.query.ocifStaking.ledger(selectedAccount.address)
            ).toPrimitive() as LedgerType).unbondingInfo.unlockingChunks.length > 0
        );
      }

      toast.dismiss();

      setLoading(false);
    } catch (error) {
      toast.dismiss();

      setLoading(false);

      toast.error(`${ error }`);
    }
  };

  const handleManageStaking = async ({
    core,
    totalUserStaked,
    availableBalance,
  }: {
    core: StakingCore;
    totalUserStaked: BigNumber;
    availableBalance: BigNumber;
  }) => {
    setOpenModal({
      name: modalName.MANAGE_STAKING,
      metadata: { ...core, totalUserStaked, availableBalance },
    });
  };

  const handleClaimAll = async () => {
    if (!selectedAccount) return;

    if (!unclaimedEras) return;

    if (!currentStakingEra) return;

    try {
      toast.loading("Claiming...");

      await web3Enable("Tinkernet");

      const injector = await web3FromAddress(selectedAccount.address);

      const batch = [];

      const uniqueCores = [
        ...new Map(unclaimedEras.cores.map((x) => [x.coreId, x])).values(),
      ];

      for (const core of uniqueCores) {
        if (!core?.earliestEra) continue;

        for (let i = 0; i < currentStakingEra - core.earliestEra; i += 1) {
          batch.push(api.tx.ocifStaking.stakerClaimRewards(core.coreId));
          console.log("pushed core: ", core.coreId);
        }
      }

      console.log("batch: ", batch);
      console.log("uniqueCores: ", uniqueCores);
      console.log("unclaimedEras: ", unclaimedEras);

      await api.tx.utility.batch(batch).signAndSend(
        selectedAccount.address,
        { signer: injector.signer },
        getSignAndSendCallback({
          onInvalid: () => {
            toast.dismiss();

            toast.error("Invalid transaction");

            setWaiting(false);
          },
          onExecuted: () => {
            toast.dismiss();

            toast.loading("Waiting for confirmation...");

            setWaiting(true);
          },
          onSuccess: () => {
            toast.dismiss();

            toast.success("Claimed successfully");

            setWaiting(false);
          },
          onDropped: () => {
            toast.dismiss();

            toast.error("Transaction dropped");

            setWaiting(false);
          },
        })
      );

      toast.dismiss();
    } catch (error) {
      toast.dismiss();

      toast.error(`${ error }`);

      console.error(error);
    }
  };

  const handleUnbondTokens = () => {
    setOpenModal({
      name: modalName.UNBOND_TOKENS,
    });
  };

  const handleRegisterProject = async () => {
    setOpenModal({
      name: modalName.REGISTER_PROJECT,
    });
  };

  const toggleExpanded = (coreId: string) => {
    setExpandedCore(expandedCore === coreId ? null : coreId);
  };

  useEffect(() => {
    loadStakingCores(selectedAccount);
  }, [selectedAccount, api]);

  useEffect(() => {
    if (!selectedAccount) return;

    if (!rewardsClaimedQuery.data?.stakers?.length) return;

    const totalClaimed = new BigNumber(
      rewardsClaimedQuery.data.stakers[0].totalRewards
    );

    setTotalClaimed(totalClaimed);
  }, [selectedAccount, rewardsClaimedQuery, api]);

  useEffect(() => {
    if (!selectedAccount) return;

    const unsubs = setupSubscriptions({ selectedAccount });

    return () => {
      unsubs.forEach(async (unsub) => (await unsub)());
    };
  }, [selectedAccount, api]);

  useEffect(() => {
    if (descriptionRef.current && expandedCore !== null) {
      console.log('got here');
      descriptionRef.current.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [expandedCore]);

  return (
    <>
      {isLoading ? (
        <div className="flex items-center justify-center">
          <LoadingSpinner />
        </div>
      ) : null}

      {!isLoading ? (
        <div className="mx-auto w-full flex max-w-7xl flex-col justify-between gap-8 p-4 sm:px-6 lg:px-8 mt-10">
          {selectedAccount &&
            currentStakingEra &&
            totalUserStaked &&
            unclaimedEras ? (
            <>
              <div className="flex flex-col flex-wrap items-center justify-between gap-4 md:flex-row">
                <div>
                  <span className="sr-only">OCIF Staking Dashboard</span>
                </div>
                <div className="flex flex-wrap gap-8">
                  <button
                    type="button"
                    className="inline-flex items-center justify-center rounded-md bg-amber-300 px-4 py-2 text-base font-medium text-black shadow-sm hover:bg-amber-200 focus:outline-none focus:ring-2 focus:ring-neutral-500 focus:ring-offset-2 disabled:bg-neutral-400"
                    onClick={handleUnbondTokens}
                    disabled={!hasUnbondedTokens}
                  >
                    Withdraw Unbonded TNKR
                  </button>

                  <button
                    type="button"
                    className="inline-flex items-center justify-center rounded-md bg-amber-300 px-4 py-2 text-base font-medium text-black shadow-sm hover:bg-amber-200 focus:outline-none focus:ring-2 focus:ring-neutral-500 focus:ring-offset-2 disabled:bg-neutral-400"
                    onClick={handleClaimAll}
                    disabled={unclaimedEras.total === 0 || isWaiting}
                  >
                    Claim TNKR Rewards
                  </button>
                </div>
              </div>

              <div
                className="relative overflow-x-auto w-full rounded-md border border-neutral-50 shadow flex align-items-center gap-10 justify-between backdrop-blur-sm p-6 tinker-scrollbar scrollbar scrollbar-thumb-amber-300 scrollbar-thin overflow-x-scroll">
                <div className="flex flex-col justify-between">
                  <div>
                    <span className="text-sm">Your stake</span>
                  </div>
                  <div>
                    <span className="text-md font-bold">
                      {formatBalance(totalUserStaked.toString(), {
                        decimals: 12,
                        withUnit: false,
                        forceUnit: "-",
                      }).slice(0, -2) || "0"}{" "}
                      TNKR
                    </span>
                  </div>
                </div>

                <div className="flex flex-col justify-between">
                  <div>
                    <span className="text-sm">Unclaimed Eras</span>
                  </div>
                  <div>
                    <span className="text-md font-bold">
                      {unclaimedEras.total} eras
                    </span>
                  </div>
                </div>

                <div className="flex flex-col justify-between">
                  <div>
                    <span className="text-sm">Claimable Rewards</span>
                  </div>
                  <div>
                    <span className="text-md font-bold">
                      {formatBalance(totalClaimed.toString(), {
                        decimals: 12,
                        withUnit: false,
                        forceUnit: "-",
                      }).slice(0, -2) || "0"}{" "}
                      TNKR
                    </span>
                  </div>
                </div>

                <div className="flex flex-col justify-between">
                  <div>
                    <span className="text-sm">Staking APY</span>
                  </div>
                  <div>
                    <span className="text-md font-bold">
                      {totalSupply &&
                        totalSupply.toNumber() > 0 &&
                        totalStaked &&
                        totalStaked.toNumber() > 0
                        ? totalSupply
                          .times(4)
                          .dividedBy(totalStaked)
                          .decimalPlaces(2)
                          .toString()
                        : 0}
                      %
                    </span>
                  </div>
                </div>

                <div className="flex flex-col justify-between">
                  <div>
                    <span className="text-sm">Annual DAO rewards</span>
                  </div>
                  <div>
                    <span className="text-md font-bold">
                      {totalSupply && totalSupply.toNumber() > 0
                        ? totalSupply
                          .dividedBy(1000000000000)
                          .times(0.06)
                          .decimalPlaces(2)
                          .toString()
                        : 0}{" "}
                      TNKR
                    </span>
                  </div>
                </div>

                <div className="flex flex-col justify-between">
                  <div>
                    <span className="text-sm">Current Era</span>
                  </div>
                  <div>
                    <span className="text-md font-bold">
                      {currentStakingEra} |{" "}
                      {(
                        ((currentBlock - (nextEraBlock - blocksPerEra)) /
                          (nextEraBlock - (nextEraBlock - blocksPerEra))) *
                        100
                      ).toFixed(0)}
                      % complete
                    </span>
                  </div>
                  {/* <div>
                    <LineChart fill={CURRENT_BLOCK_FILLED_PERCENTAGE} />
                  </div> */}
                </div>
              </div>
            </>
          ) : null}

          <div>
            {selectedAccount ? (
              <button
                type="button"
                onClick={handleRegisterProject}
                className="inline-flex items-center justify-center rounded-md border border-amber-300 bg-amber-300 px-4 py-2 text-base font-medium text-black shadow-sm hover:bg-amber-200 focus:outline-none focus:ring-2 focus:ring-neutral-500 focus:ring-offset-2 disabled:opacity-40"
              >
                Register Project
              </button>
            ) : null}
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {stakingCores.map((core) => {
              const totalUserStaked = userStakedInfo.find(
                (info) => info.coreId === core.key
              )?.staked;

              const coreInfo = coreEraStakeInfo.find(
                (info) => info.account === core.account
              );

              return (
                <div
                  key={core.account}
                  className="relative flex flex-col gap-4 overflow-hidden rounded-md p-4 sm:flex-row border border-neutral-50 backdrop-blur-sm"
                >
                  <div className="flex w-full flex-col gap-4 justify-between">
                    <div className="h-72">
                      <div className="flex flex-row items-center gap-4">
                        <div className="flex flex-shrink-0">
                          <img
                            src={core.metadata.image}
                            alt={core.metadata.name}
                            className="h-16 w-16 rounded-full"
                          />
                        </div>
                        <h4 className="font-bold">{core.metadata.name}</h4>
                      </div>

                      <div ref={descriptionRef} className={`mt-3 overflow-y-scroll ${ expandedCore !== core.account ? '' : 'h-[73%] tinker-scrollbar scrollbar scrollbar-thumb-amber-300 scrollbar-thin pr-3' }`}>
                        <div>
                          <p
                            className={`relative text-sm overflow-hidden transition-all duration-200 ${ expandedCore !== core.account ? "line-clamp-2 gradient-bottom" : "" }`}
                            onClick={() => toggleExpanded(core.account)}
                          >
                            {core.metadata.description}
                          </p>
                          <button
                            className={`flex flex-row text-xs items-center gap-1 mx-auto mt-2 mb-5 text-amber-300 hover:text-amber-50 rounded-lg text-xxs border border-amber-300 px-2 py-1 focus:outline-none ${ expandedCore !== core.account ? "relative top-[-10px]" : "" }`}
                            onClick={() => toggleExpanded(core.account)}
                          >
                            SHOW {expandedCore === core.account ? "LESS" : "MORE"}
                            <svg className={`w-2 h-2 transform transition-transform duration-200 ${ expandedCore === core.account ? "rotate-180" : "" }`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>
                        </div>

                        <div className="flex w-full flex-col border border-neutral-50 rounded-md mb-1">
                          <div className="flex items-center justify-between border-b border-neutral-50 py-2 px-3">
                            <div className="text-xs">Total Stakers</div>
                            <div className="flex flex-row">
                              {(coreInfo?.numberOfStakers || 0) >=
                                (chainProperties?.maxStakersPerCore || 0) ? (
                                <LockClosedIcon
                                  className="h-5 w-5 cursor-pointer text-white"
                                  onClick={() => {
                                    toast.error(
                                      "This core has reached the staker limit"
                                    );
                                  }}
                                />
                              ) : (
                                <UserGroupIcon
                                  className="h-5 w-5 cursor-pointer text-white"
                                  onClick={() => {
                                    toast.success(
                                      "This core can have more stakers"
                                    );
                                  }}
                                />
                              )}
                              <span className="ml-1 truncate text-sm font-bold">
                                {coreInfo?.numberOfStakers || "0"}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between border-b border-neutral-50 py-2 px-3">
                            <span className="truncate text-xs">Total Staked</span>
                            <span className="truncate text-sm font-bold">
                              {coreInfo?.total
                                ? formatBalance(coreInfo.total.toString(), {
                                  decimals: 12,
                                  withUnit: false,
                                  forceUnit: "-",
                                }).slice(0, -2)
                                : "0"}{" "}
                              TNKR
                            </span>
                          </div>

                          <div className="flex items-center justify-between py-2 px-3">
                            <span className="text-xs">My Stake</span>
                            <span className="text-sm font-bold">
                              {totalUserStaked
                                ? `${ formatBalance(
                                  totalUserStaked.toString(),
                                  {
                                    decimals: 12,
                                    withUnit: false,
                                    forceUnit: "-",
                                  }
                                ).slice(0, -2) } TNKR`
                                : '--'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {selectedAccount ? (
                      <div className="flex items-center justify-between gap-2">
                        <button
                          type="button"
                          className="inline-flex w-full items-center justify-center rounded-md border border-amber-300 bg-amber-300 px-4 py-2 text-sm font-medium text-black shadow-sm hover:bg-amber-200 focus:outline-none focus:ring-2 focus:ring-neutral-500 focus:ring-offset-2 disabled:border-neutral-400 disabled:bg-neutral-400"
                          onClick={() => {
                            const parsedTotalStaked =
                              totalUserStaked || new BigNumber("0");

                            const parsedAvailableBalance =
                              availableBalance?.minus(
                                new BigNumber(10).pow(12).times(2)
                              ) || new BigNumber("0");

                            handleManageStaking({
                              core,
                              totalUserStaked: parsedTotalStaked,
                              availableBalance:
                                parsedAvailableBalance.isNegative()
                                  ? new BigNumber("0")
                                  : parsedAvailableBalance,
                            });
                          }}
                          disabled={
                            (coreInfo?.numberOfStakers || 0) >=
                            (chainProperties?.maxStakersPerCore || 0) &&
                            !totalUserStaked
                          }
                        >
                          Manage Staking
                        </button>
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
    </>
  );
};

export default Staking;
