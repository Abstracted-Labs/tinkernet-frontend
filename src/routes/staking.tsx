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
import useRPC, { host } from "../stores/rpc";
import { ISubmittableResult } from "@polkadot/types/types";
import { UserGroupIcon, NoSymbolIcon } from "@heroicons/react/24/solid";
import { UserGroupIcon as UserGroupIconMini } from "@heroicons/react/20/solid";

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
  const [currentEra, setCurrentEra] = useState<{
    era: number;
    inflationEra: number;
  }>();
  const [coreEraStakeInfo, setCoreEraStakeInfo] = useState<
    {
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

  const [rewardsClaimedQuery, executeRewardsClaimedQuery] = useQuery({
    query: TotalRewardsClaimedQuery,
    variables: {
      accountId: selectedAccount
        ? encodeAddress(selectedAccount.address, 2)
        : null,
    },

    pause: !selectedAccount,
  });

  const [totalClaimed, setTotalClaimed] = useState<BigNumber>(new BigNumber(0));

  const [chainProperties, setChainProperties] = useState<{maxStakersPerCore: number; inflationErasPerYear: number}>();

    const [hoveringMaxStakerIcon, setHoveringMaxStakerIcon] = useState<number | null>(null);

    const [currentBlock, setCurrentBlock] = useState<number>(0);

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

      setUnclaimedEras((unclaimed) => ({ ...unclaimed, total: 0 }));

      setTotalClaimed(totalClaimed);
    }
  );

  const getSignAndSendCallback = () => {
    let hasFinished = false;

    return ({ status }: ISubmittableResult) => {
      if (hasFinished) {
        return;
      }

      if (status.isInvalid) {
        toast.error("Transaction is invalid");

        hasFinished = true;
      } else if (status.isReady) {
        toast.loading("Submitting transaction...");
      } else if (status.isDropped) {
        toast.error("Transaction dropped");

        hasFinished = true;
      } else if (status.isInBlock || status.isFinalized) {
        toast.dismiss();

        toast.success("Transaction submitted!");

        hasFinished = true;

        loadStakingCores(selectedAccount);
      } else throw new Error("UNKNOWN_RESULT");
    };
  };

  const loadStakingCores = async (
    selectedAccount: InjectedAccountWithMeta | null
  ) => {
    setLoading(true);

    try {
      toast.loading("Loading staking cores...");

        setChainProperties({
            maxStakersPerCore: api.consts.ocifStaking.maxStakersPerCore.toPrimitive() as number,
            inflationErasPerYear: api.consts.checkedInflation.erasPerYear.toPrimitive() as number
        });

        const unsubscribe = await api.rpc.chain.subscribeNewHeads((header) => {
            console.log(`Chain is at block: #${header.number}`);

            setCurrentBlock(header.number.toNumber());
        });

      const results = await Promise.all([
        // registered cores
        api.query.ocifStaking.registeredCore.entries(),
        // current era of inflation
        api.query.checkedInflation.currentEra(),
        // current era of staking
        api.query.ocifStaking.currentEra(),
      ]);

      const stakingCores = results[0].map(
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

      const currentEra = {
        inflationEra: results[1].toPrimitive() as number,
        era: results[2].toPrimitive() as number
      };

      setCurrentEra(currentEra);

      const coreEraStakeInfo: {
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
            currentEra.era
          )
        ).toPrimitive() as {
          total: string;
          numberOfStakers: number;
          rewardClaimed: boolean;
          active: boolean;
        };

        coreEraStakeInfo.push({
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

            if (parseInt(unclaimedEarliest) < currentEra.era) {
              const unclaimed = unclaimedEras;

              unclaimed.cores.filter((value) => {
                return value.coreId != stakingCore.key;
              });

              unclaimed.cores.push({
                coreId: stakingCore.key,
                earliestEra: parseInt(unclaimedEarliest),
              });

              if (
                currentEra.era - parseInt(unclaimedEarliest) >
                unclaimed.total
              ) {
                unclaimed.total = currentEra.era - parseInt(unclaimedEarliest);
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

      executeRewardsClaimedQuery({ requestPolicy: "network-only" });

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
    handleCallback,
  }: {
    core: StakingCore;
    totalStaked: BigNumber;
    availableBalance: BigNumber;
    handleCallback: () => void;
  }) => {
    setOpenModal({
      name: modalName.MANAGE_STAKING,
      metadata: { ...core, totalStaked, availableBalance, handleCallback },
    });
  };

  const handleClaimAll = async () => {
    if (!selectedAccount) return;

    if (!unclaimedEras) return;

    if (!currentEra) return;

    await web3Enable("Tinkernet");

    const injector = await web3FromAddress(selectedAccount.address);

    const batch = [];

    const uniqueCores = [
      ...new Map(unclaimedEras.cores.map((x) => [x.coreId, x])).values(),
    ];

    for (const core of uniqueCores) {
      if (!core?.earliestEra) continue;

      for (let i = 0; i < currentEra.era - core.earliestEra; i++) {
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

  return (
    <>
      {isLoading ? (
        <div className="flex items-center justify-center">
          <LoadingSpinner />
        </div>
      ) : null}

      {!isLoading && stakingCores.length > 0 ? (
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-8 p-4 sm:px-6 lg:px-8">
          {selectedAccount && currentEra && totalStaked && unclaimedEras ? (
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
                      {currentEra.inflationEra} / {chainProperties?.inflationErasPerYear || "0"}
                    </span>
                    <div>
                        <span className="text-sm">
                            Current block: {currentBlock}
                        </span>
                        <div>
                        <span className="test-sm">
                            TODO: Implement a progress bar here instead of the current block number.
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
                              className="inline-flex items-center justify-center rounded-md border border-amber-300 bg-amber-300 px-2 py-1 text-sm font-medium text-black shadow-sm hover:bg-amber-200 focus:outline-none focus:ring-2 focus:ring-neutral-500 focus:ring-offset-2 disabled:bg-neutral-400 disabled:border-neutral-400"
                            onClick={() => {
                              const parsedTotalStaked =
                                totalStaked || new BigNumber("0");

                              const parsedAvailableBalance =
                                availableBalance?.minus(
                                  new BigNumber(10).pow(12)
                                ) || new BigNumber("0");

                              const handleCallback = () => {
                                loadStakingCores(selectedAccount);
                              };

                              handleManageStaking({
                                core,
                                totalStaked: parsedTotalStaked,
                                availableBalance:
                                  parsedAvailableBalance.isNegative()
                                    ? new BigNumber("0")
                                    : parsedAvailableBalance,
                                handleCallback,
                              });
                            }}
                            disabled={((coreInfo?.numberOfStakers || 0) >= (chainProperties?.maxStakersPerCore || 0)) && !totalStaked}
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
                        <div className="truncate text-sm flex gap-1">
                            {(coreInfo?.numberOfStakers || 0) >= (chainProperties?.maxStakersPerCore || 0) ?
                             (
                                 <div className="flex justify-center" style={{alignItems: "center"}}
                                 onMouseEnter={() => setHoveringMaxStakerIcon(core.key)}
                                 onMouseLeave={() => setHoveringMaxStakerIcon(null)}
                                 >
                                     <NoSymbolIcon className="h-5 w-5 text-red-300" style={{position: "absolute"}} />
                                     <UserGroupIconMini className="h-3 w-3 text-white" />
                                     <div id="stakerLimitTooltip" style={{
                                         position: "absolute",
                                         left: "30px",
                                         bottom: "1px",
                                         fontFamily: "Helvetica Neue,Helvetica,Arial,sans-serif",
                                         fontStyle: "normal",
                                         fontWeight: "400",
                                         letterSpacing: "normal",
                                         lineHeight: "1.42857143",
                                         textAlign: "start",
                                         textShadow: "none",
                                         textTransform: "none",
                                         whiteSpace: "normal",
                                         wordBreak: "normal",
                                         wordSpacing: "normal",
                                         wordWrap: "normal",
                                         fontSize: "12px",
                                         display: hoveringMaxStakerIcon == core.key ? "block" : "none",
                                         marginTop: "-5px"
                                         }}>
        <div style={{
            maxWidth: "200px",
            padding: "3px 8px",
            color: "#fff",
            textAlign: "center",
            backgroundColor: "#000",
            borderRadius: "4px"
        }}>
            This core has reached the staker limit
        </div>
                                 </div>
                                 </div>
                             )
                            :
                             (
                                 <UserGroupIcon className="h-5 w-5 text-white" />
                             )
                            }
                          {coreInfo?.numberOfStakers || "0"} stakers
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
