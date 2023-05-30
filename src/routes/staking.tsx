import { web3Enable, web3FromAddress } from "@polkadot/extension-dapp";
import { InjectedAccountWithMeta } from "@polkadot/extension-inject/types";
import { formatBalance } from "@polkadot/util";
import { encodeAddress } from "@polkadot/util-crypto";
import BigNumber from "bignumber.js";
import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import LoadingSpinner from "../components/LoadingSpinner";
import useApi from "../hooks/useApi";
import useAccount from "../stores/account";
import useModal, { modalName } from "../stores/modals";
import { useQuery, useSubscription } from "urql";
import { Codec, ISubmittableResult } from "@polkadot/types/types";
import { UserGroupIcon, LockClosedIcon } from "@heroicons/react/24/outline";
// import LineChart from "../components/LineChart";
// import PieChart from "../components/PieChart";

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
  const [blocksPerEra, setBlocksPerEra] = useState<number>(0);

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

    if (currentStakingEra > 0) {
      api.query.ocifStaking.generalEraInfo(currentStakingEra, (c: Codec) => {
        const stakingInfo = c.toPrimitive() as {
          staked: string;
        };

        setTotalStaked(new BigNumber(stakingInfo.staked));
      });
    }

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

      api.query.ocifStaking.ledger(selectedAccount.address, (c: Codec) => {
        const ledger = c.toPrimitive() as {
          locked: number;
          unbondingInfo: {
            unlockingChunks: {
              amount: number;
              unlockEra: number;
            }[];
          };
        };

        setHasUnbondedTokens(ledger.unbondingInfo.unlockingChunks.length > 0);
      });

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
        hasFinished = true;

        toast.dismiss();
      }
    };
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
      ).toPrimitive() as {
        staked: string;
      };

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

        const totalUserStaked = userStakedInfo.reduce(
          (acc, cur) => acc.plus(cur.staked),
          new BigNumber(0)
        );

        setTotalUserStaked(totalUserStaked);

        setHasUnbondedTokens(
          (
            (
              await api.query.ocifStaking.ledger(selectedAccount.address)
            ).toPrimitive() as {
              locked: number;
              unbondingInfo: {
                unlockingChunks: {
                  amount: number;
                  unlockEra: number;
                }[];
              };
            }
          ).unbondingInfo.unlockingChunks.length > 0
        );
      }

      toast.dismiss();

      setLoading(false);
    } catch (error) {

      toast.dismiss();

      setLoading(false);

      toast.error(`${error}`);
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
    if (!selectedAccount) return;
    if (!api.query.ocifStaking) return;

    // TODO unsubscribe on unmount
    setupSubscriptions({ selectedAccount });
  }, [api, stakingCores]);

  return (
    <>
      {isLoading ? (
        <div className="flex items-center justify-center">
          <LoadingSpinner />
        </div>
      ) : null}

      {!isLoading ? (
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-8 p-4 sm:px-6 lg:px-8">
          {selectedAccount &&
          currentStakingEra &&
          totalUserStaked &&
          unclaimedEras ? (
            <>
              <div className="flex flex-col flex-wrap items-center justify-between gap-4 md:flex-row">
                <div>
                  <span>Dashboard</span>
                </div>

                <div className="flex flex-wrap gap-8">
                  <button
                    type="button"
                    className="inline-flex items-center justify-center rounded-md bg-amber-300 px-4 py-2 text-base font-medium text-black shadow-sm hover:bg-amber-200 focus:outline-none focus:ring-2 focus:ring-neutral-500 focus:ring-offset-2 disabled:bg-neutral-400"
                    onClick={handleUnbondTokens}
                    disabled={!hasUnbondedTokens}
                  >
                    Unbonding TNKR
                  </button>

                  <button
                    type="button"
                    className="inline-flex items-center justify-center rounded-md bg-amber-300 px-4 py-2 text-base font-medium text-black shadow-sm hover:bg-amber-200 focus:outline-none focus:ring-2 focus:ring-neutral-500 focus:ring-offset-2 disabled:bg-neutral-400"
                    onClick={handleClaimAll}
                    disabled={unclaimedEras.total === 0}
                  >
                    Claim Rewards
                  </button>
                </div>
              </div>

              <div className="relative overflow-hidden rounded-md border border-neutral-50 bg-neutral-900 shadow sm:grid md:grid-cols-2 lg:grid-cols-6">
                <div className="flex flex-col gap-2 p-6">
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

                <div className="flex flex-col gap-2 p-6">
                  <div>
                    <span className="text-sm">Unclaimed Eras</span>
                  </div>
                  <div>
                    <span className="text-md font-bold">
                      {unclaimedEras.total} eras
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-2 p-6">
                  <div>
                    <span className="text-sm">Total Rewards Claimed</span>
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

                <div className="flex flex-col gap-2 p-6">
                  <div>
                    <span className="text-sm">Current Staking APY</span>
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

                <div className="flex flex-col gap-2 p-6">
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

                <div className="flex flex-col gap-2 p-6">
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

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
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
                  className="relative flex flex-col gap-4 overflow-hidden rounded-md border border-neutral-50 bg-neutral-900 p-6 pb-28 sm:flex-row"
                >
                  <div className="flex w-full flex-col gap-4">
                    <div className="flex flex-shrink-0">
                      <img
                        src={core.metadata.image}
                        alt={core.metadata.name}
                        className="h-16 w-16 rounded-full"
                      />
                    </div>
                    <div className="flex flex-col gap-4">
                      <h4 className="font-bold">{core.metadata.name}</h4>

                      <p className="text-sm">{core.metadata.description}</p>
                    </div>

                    <div className="absolute bottom-0 left-0 flex w-full flex-col gap-4 p-6">
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

                          <span className="block text-sm">
                            {totalUserStaked
                              ? `Your stake: ${formatBalance(
                                  totalUserStaked.toString(),
                                  {
                                    decimals: 12,
                                    withUnit: false,
                                    forceUnit: "-",
                                  }
                                ).slice(0, -2)} TNKR`
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
                          TNKR staked
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
                  onClick={handleRegisterProject}
                  className="inline-flex items-center justify-center rounded-md border border-amber-300 bg-amber-300 px-4 py-2 text-base font-medium text-black shadow-sm hover:bg-amber-200 focus:outline-none focus:ring-2 focus:ring-neutral-500 focus:ring-offset-2 disabled:opacity-40"
                >
                  Register Project
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
