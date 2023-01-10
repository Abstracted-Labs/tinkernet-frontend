import { web3Enable, web3FromAddress } from "@polkadot/extension-dapp";
import { InjectedAccountWithMeta } from "@polkadot/extension-inject/types";
import { formatBalance } from "@polkadot/util";
import { encodeAddress } from "@polkadot/util-crypto";
import { Codec } from "@polkadot/types-codec/types/codec";
import BigNumber from "bignumber.js";
import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import LoadingSpinner from "../components/LoadingSpinner";
import useApi from "../hooks/useApi";
import useAccount from "../stores/account";
import useModal, { modalName } from "../stores/modals";
import { useQuery, useSubscription } from "urql";
import useRPC, { host } from "../stores/rpc";
import { ISubmittableResult } from "@polkadot/types/types";
import { UserGroupIcon, LockClosedIcon } from "@heroicons/react/24/outline";

const { REMOTE, BRAINSTORM } = host;

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

const Staking = () => {
  const setOpenModal = useModal((state) => state.setOpenModal);
  const selectedAccount = useAccount((state) => state.selectedAccount);
  const api = useApi();
  const { host, setHost } = useRPC();
  const [stakingCores, setStakingCores] = useState<StakingCore[]>([]);
  const [currentStakingEra, setCurrentStakingEra] = useState<number>(0);
  const [currentInflationEra, setCurrentInflationEra] = useState<number>(0);
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
  const [totalStaked, setTotalStaked] = useState<BigNumber>();
  const [userStakedInfo, setUserStakedInfo] = useState<
    {
      coreId: number;
      era: number;
      staked: BigNumber;
    }[]
  >([]);
  const [unclaimedEras, setUnclaimedEras] = useState<{
    cores: { coreId: number; earliestEra: number }[];
    total: number;
  }>({ cores: [], total: 0 });
  const [availableBalance, setAvailableBalance] = useState<BigNumber>();

  const [isLoading, setLoading] = useState(false);

  const [rewardsClaimedQuery] = useQuery({
    query: TotalRewardsClaimedQuery,
    variables: {
      accountId: selectedAccount
        ? encodeAddress(selectedAccount.address, 2)
        : null,
    },

    pause: !selectedAccount,
  });

  const [totalClaimed, setTotalClaimed] = useState<BigNumber>(new BigNumber(0));

  const [chainProperties, setChainProperties] = useState<{
    maxStakersPerCore: number;
    inflationErasPerYear: number;
  }>();

  const [currentBlock, setCurrentBlock] = useState<number>(0);
  const [nextEraBlock, setNextEraBlock] = useState<number>(0);

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
      result: { stakers: { latestClaimBlock: number; totalRewards: string }[] }
    ) => {
      if (result.stakers.length === 0) return;

      const totalClaimed = new BigNumber(result.stakers[0].totalRewards);

      setTotalClaimed(totalClaimed);

      // TODO change calculation for this
      setUnclaimedEras((unclaimed) => ({
        ...unclaimed,
        total: 0,
      }));

      // dismiss toast of claim all
      toast.dismiss();
    }
  );

  const setupSubscriptions = ({
    selectedAccount,
  }: {
    selectedAccount: InjectedAccountWithMeta;
  }) => {
    // Current block subscription
    api.rpc.chain.subscribeNewHeads((header) => {
      setCurrentBlock(header.number.toNumber());
    });

    // Next era starting block subscription
    api.query.ocifStaking.nextEraStartingBlock((blockNumber: Codec) => {
      setNextEraBlock(blockNumber.toPrimitive() as number);
    });

    // Inflation current era subscription
    api.query.checkedInflation.currentEra((era: Codec) => {
      setCurrentInflationEra(era.toPrimitive() as number);
    });

    // Staking current era subscription
    api.query.ocifStaking.currentEra((era: Codec) => {
      setCurrentStakingEra(era.toPrimitive() as number);
    });

    api.query.system.account(selectedAccount.address, async (account) => {
      const balance = account.toPrimitive() as {
        nonce: string;
        consumers: string;
        providers: string;
        sufficients: string;
        data: {
          free: string;
          reserved: string;
          miscFrozen: string;
          feeFrozen: string;
        };
      };

      const locked = (
        await api.query.ocifStaking.ledger(selectedAccount.address)
      ).toPrimitive() as { locked: string };

      setAvailableBalance(
        new BigNumber(balance.data.free).minus(new BigNumber(locked.locked))
      );
    });

    // Core era stake + Use era stake subscriptions
    const coreEraStakeInfoMap: Map<
      number,
      {
        coreId: number;
        account: string;
        total: string;
        numberOfStakers: number;
        rewardClaimed: boolean;
        active: boolean;
      }
    > = new Map();

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
          const coreEraStake = c.toPrimitive() as {
            total: string;
            numberOfStakers: number;
            rewardClaimed: boolean;
            active: boolean;
          };

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

      api.query.ocifStaking.generalStakerInfo(
        stakingCore.key,
        selectedAccount.address,
        (generalStakerInfo: Codec) => {
          const info = generalStakerInfo.toPrimitive() as {
            stakes: { era: string; staked: string }[];
          };

          if (info.stakes.length > 0) {
            const unclaimedEarliest = info.stakes[0].era;

            if (parseInt(unclaimedEarliest) < currentStakingEra) {
              const unclaimed = unclaimedEras;

              unclaimed.cores.filter((value) => {
                return value.coreId != stakingCore.key;
              });

              unclaimed.cores.push({
                coreId: stakingCore.key,
                earliestEra: parseInt(unclaimedEarliest),
              });

              if (
                currentStakingEra - parseInt(unclaimedEarliest) >
                unclaimed.total
              ) {
                unclaimed.total =
                  currentStakingEra - parseInt(unclaimedEarliest);
              }

              setUnclaimedEras(unclaimed);
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

              setTotalStaked(newTotalStaked);
            }
          }
        }
      );
    }
  };

  const getSignAndSendCallback = () => {
    let hasFinished = false;

    return ({ status }: ISubmittableResult) => {
      if (hasFinished) {
        return;
      }

      if (status.isInvalid) {
        toast.dismiss();

        toast.error("Transaction is invalid");

        hasFinished = true;
      } else if (status.isReady) {
        toast.loading("Submitting transaction...");
      } else if (status.isDropped) {
        toast.dismiss();

        toast.error("Transaction dropped");

        hasFinished = true;
      } else if (status.isInBlock || status.isFinalized) {
        // do nothing, because if the transaction is finalized, the squid will be updated and dismiss the toast

        hasFinished = true;
      }
    };
  };

  const loadStakingCores = async (
    selectedAccount: InjectedAccountWithMeta | null
  ) => {
    setLoading(true);
    try {
      toast.loading("Loading staking cores...");

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

      setCurrentInflationEra(
        (await api.query.checkedInflation.currentEra()).toPrimitive() as number
      );

      const currentStakingEra = (
        await api.query.ocifStaking.currentEra()
      ).toPrimitive() as number;

      setCurrentStakingEra(currentStakingEra);

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
          const c = core.toPrimitive() as {
            account: string;
            metadata: {
              name: string;
              description: string;
              image: string;
            };
          };

          const primitiveKey = key.toPrimitive() as number;

          return {
            key: primitiveKey,
            ...c,
          };
        }
      );

      setStakingCores(stakingCores);

      const coreEraStakeInfo: {
        coreId: number;
        account: string;
        total: string;
        numberOfStakers: number;
        rewardClaimed: boolean;
        active: boolean;
      }[] = [];

      for (const stakingCore of stakingCores) {
        const coreEraStake = (
          await api.query.ocifStaking.coreEraStake(
            stakingCore.key,
            currentStakingEra
          )
        ).toPrimitive() as {
          total: string;
          numberOfStakers: number;
          rewardClaimed: boolean;
          active: boolean;
        };

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

        const balance = results[0].toPrimitive() as {
          nonce: string;
          consumers: string;
          providers: string;
          sufficients: string;
          data: {
            free: string;
            reserved: string;
            miscFrozen: string;
            feeFrozen: string;
          };
        };

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

        for (const stakingCore of stakingCores) {
          const generalStakerInfo =
            await api.query.ocifStaking.generalStakerInfo(
              stakingCore.key,
              selectedAccount.address
            );

          const info = generalStakerInfo.toPrimitive() as {
            stakes: { era: string; staked: string }[];
          };

          if (info.stakes.length > 0) {
            const unclaimedEarliest = info.stakes[0].era;

            if (parseInt(unclaimedEarliest) < currentStakingEra) {
              const unclaimed = unclaimedEras;

              unclaimed.cores.filter((value) => {
                return value.coreId != stakingCore.key;
              });

              unclaimed.cores.push({
                coreId: stakingCore.key,
                earliestEra: parseInt(unclaimedEarliest),
              });

              if (
                currentStakingEra - parseInt(unclaimedEarliest) >
                unclaimed.total
              ) {
                unclaimed.total =
                  currentStakingEra - parseInt(unclaimedEarliest);
              }

              setUnclaimedEras(unclaimed);
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

        setUserStakedInfo(userStakedInfo);

        const totalStaked = userStakedInfo.reduce(
          (acc, cur) => acc.plus(cur.staked),
          new BigNumber(0)
        );

        setTotalStaked(totalStaked);
      }

      toast.dismiss();

      setLoading(false);
    } catch (e) {
      console.error(e);

      toast.dismiss();

      setLoading(false);

      toast.error("Failed to load staking cores!");
    }
  };

  const handleManageStaking = async ({
    core,
    totalStaked,
    availableBalance,
  }: {
    core: StakingCore;
    totalStaked: BigNumber;
    availableBalance: BigNumber;
  }) => {
    setOpenModal({
      name: modalName.MANAGE_STAKING,
      metadata: { ...core, totalStaked, availableBalance },
    });
  };

  const handleClaimAll = async () => {
    if (!selectedAccount) return;

    if (!unclaimedEras) return;

    if (!currentStakingEra) return;

    await web3Enable("Tinkernet");

    const injector = await web3FromAddress(selectedAccount.address);

    const batch = [];

    const uniqueCores = [
      ...new Map(unclaimedEras.cores.map((x) => [x.coreId, x])).values(),
    ];

    for (const core of uniqueCores) {
      if (!core?.earliestEra) continue;

      for (let i = 0; i < currentStakingEra - core.earliestEra; i++) {
        batch.push(api.tx.ocifStaking.stakerClaimRewards(core.coreId));
      }
    }

    api.tx.utility
      .batch(batch)
      .signAndSend(
        selectedAccount.address,
        { signer: injector.signer },
        getSignAndSendCallback()
      );
  };

  useEffect(() => {
    if (!api.query.ocifStaking) return;

    loadStakingCores(selectedAccount);
  }, [selectedAccount, api]);

  useEffect(() => {
    if (!selectedAccount) return;

    if (rewardsClaimedQuery.fetching) return;

    if (!rewardsClaimedQuery.data) return;

    if (rewardsClaimedQuery.data.stakers.length === 0) return;

    const totalClaimed = new BigNumber(
      rewardsClaimedQuery.data.stakers[0].totalRewards
    );

    setTotalClaimed(totalClaimed);
  }, [selectedAccount, rewardsClaimedQuery.fetching, api]);

  useEffect(() => {
    setHost(BRAINSTORM);

    return () => {
      setHost(REMOTE);
    };
  }, [host]);

  useEffect(() => {
    if (!selectedAccount) return;
    if (!api.query.ocifStaking) return;
    if (stakingCores.length === 0) return;

    // TODO unsusbscribe on unmount
    setupSubscriptions({ selectedAccount });
  }, [api, stakingCores]);

  return (
    <>
      {isLoading ? (
        <div className="flex items-center justify-center">
          <LoadingSpinner />
        </div>
      ) : null}

      {!isLoading && stakingCores.length > 0 ? (
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-8 p-4 sm:px-6 lg:px-8">
          {selectedAccount &&
          currentStakingEra &&
          totalStaked &&
          unclaimedEras ? (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <span>Dashboard</span>
                </div>

                <div>
                  <button
                    type="button"
                    className="inline-flex items-center justify-center rounded-md bg-amber-300 px-4 py-2 text-base font-medium text-black shadow-sm hover:bg-amber-200 focus:outline-none focus:ring-2 focus:ring-neutral-500 focus:ring-offset-2 disabled:bg-neutral-400"
                    onClick={handleClaimAll}
                    disabled={unclaimedEras.total === 0}
                  >
                    Claim All
                  </button>
                </div>
              </div>

              <div className="relative overflow-hidden rounded-md border border-neutral-50 bg-neutral-900 shadow sm:grid md:grid-cols-2 lg:grid-cols-4">
                <div className="flex flex-col gap-2 p-6">
                  <div>
                    <span className="text-sm">Your stake</span>
                  </div>
                  <div>
                    <span className="text-2xl font-bold">
                      {formatBalance(totalStaked.toString(), {
                        decimals: 12,
                        withUnit: false,
                        forceUnit: "-",
                      }).slice(0, -2) || "0"}{" "}
                      🧠⛈️
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-2 p-6">
                  <div>
                    <span className="text-sm">Unclaimed Eras</span>
                  </div>
                  <div>
                    <span className="text-2xl font-bold">
                      {unclaimedEras.total} eras
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-2 p-6">
                  <div>
                    <span className="text-sm">Total Rewards Claimed</span>
                  </div>
                  <div>
                    <span className="text-2xl font-bold">
                      {formatBalance(totalClaimed.toString(), {
                        decimals: 12,
                        withUnit: false,
                        forceUnit: "-",
                      }).slice(0, -2) || "0"}{" "}
                      🧠⛈️
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-2 p-6">
                  <div>
                    <span className="text-sm">Current Era</span>
                  </div>
                  <div>
                    <span className="text-2xl font-bold">
                      {currentInflationEra} /{" "}
                      {chainProperties?.inflationErasPerYear || "0"}
                    </span>
                  </div>
                  <div>
                    <div className="w-100 h-4 rounded-full bg-neutral-800">
                      <div
                        className="flex h-4 animate-pulse items-center justify-center rounded-full bg-green-600"
                        style={{
                          width: `${
                            ((currentBlock - (nextEraBlock - 7200)) /
                              (nextEraBlock - (nextEraBlock - 7200))) *
                            100
                          }%`,
                        }}
                      >
                        <span className="text-xs">
                          {Math.trunc(
                            ((currentBlock - (nextEraBlock - 7200)) /
                              (nextEraBlock - (nextEraBlock - 7200))) *
                              100
                          )}
                          %
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : null}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {stakingCores.map((core) => {
              const totalStaked = userStakedInfo.find(
                (info) => info.coreId === core.key
              )?.staked;

              const coreInfo = coreEraStakeInfo.find(
                (info) => info.account === core.account
              );

              return (
                <div
                  key={core.account}
                  className="relative flex flex-col gap-4 overflow-hidden rounded-md border border-neutral-50 p-6 pb-28 sm:flex-row"
                >
                  <div className="flex w-full flex-col justify-between gap-4">
                    <div className="flex flex-shrink-0">
                      <img
                        src={core.metadata.image}
                        alt={core.metadata.name}
                        className="h-16 w-16 rounded-full"
                      />
                    </div>
                    <div className="flex flex-col gap-4">
                      <h4 className="font-bold">{core.metadata.name}</h4>

                      <p className="text-sm line-clamp-6">
                        {core.metadata.description}
                      </p>
                    </div>

                    <div className="absolute bottom-0 left-0 flex w-full flex-col gap-4 p-6">
                      {selectedAccount ? (
                        <div className="flex items-center justify-between gap-2">
                          <button
                            type="button"
                            className="inline-flex items-center justify-center rounded-md border border-amber-300 bg-amber-300 px-2 py-1 text-sm font-medium text-black shadow-sm hover:bg-amber-200 focus:outline-none focus:ring-2 focus:ring-neutral-500 focus:ring-offset-2 disabled:border-neutral-400 disabled:bg-neutral-400"
                            onClick={() => {
                              const parsedTotalStaked =
                                totalStaked || new BigNumber("0");

                              const parsedAvailableBalance =
                                availableBalance?.minus(
                                  new BigNumber(10).pow(12)
                                ) || new BigNumber("0");

                              handleManageStaking({
                                core,
                                totalStaked: parsedTotalStaked,
                                availableBalance:
                                  parsedAvailableBalance.isNegative()
                                    ? new BigNumber("0")
                                    : parsedAvailableBalance,
                              });
                            }}
                            disabled={
                              (coreInfo?.numberOfStakers || 0) >=
                                (chainProperties?.maxStakersPerCore || 0) &&
                              !totalStaked
                            }
                          >
                            {totalStaked ? "Manage Staking" : "Stake"}
                          </button>

                          <span className="block text-sm">
                            {totalStaked
                              ? `Your stake: ${formatBalance(
                                  totalStaked.toString(),
                                  {
                                    decimals: 12,
                                    withUnit: false,
                                    forceUnit: "-",
                                  }
                                ).slice(0, -2)} 🧠⛈️`
                              : null}
                          </span>
                        </div>
                      ) : null}

                      <div className="flex items-center justify-between">
                        <div className="flex gap-2 ">
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

                          <span className="truncate text-sm">
                            {coreInfo?.numberOfStakers || "0"} stakers
                          </span>
                        </div>
                        <div className="truncate text-sm">
                          {coreInfo?.total
                            ? formatBalance(coreInfo.total.toString(), {
                                decimals: 12,
                                withUnit: false,
                                forceUnit: "-",
                              }).slice(0, -2)
                            : "0"}{" "}
                          🧠⛈️ staked
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {selectedAccount ? (
            <div className="flex items-center justify-between">
              <div />

              <div>
                <button
                  type="button"
                  disabled
                  className="inline-flex items-center justify-center rounded-md border border-amber-300 bg-amber-300 px-4 py-2 text-base font-medium text-black shadow-sm hover:bg-amber-200 focus:outline-none focus:ring-2 focus:ring-neutral-500 focus:ring-offset-2 disabled:opacity-40"
                >
                  Register Project (Coming Soon)
                </button>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </>
  );
};

export default Staking;
