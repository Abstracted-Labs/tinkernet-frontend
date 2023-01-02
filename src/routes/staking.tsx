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
import useModal, { ModalName } from "../stores/modals";
import { useQuery } from "urql";

const totalRewardsClaimed = `
  query totalRewardsClaimed($accountId: String!) {
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

  const [stakingCores, setStakingCores] = useState<StakingCore[]>([]);
  const [currentEra, setCurrentEra] = useState<{
    era: number;
    inflationEra: number;
    erasPerYear: number;
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

  const [query] = useQuery({
    query: totalRewardsClaimed,
    variables: {
      accountId: selectedAccount
        ? encodeAddress(selectedAccount.address, 2)
        : "",
    },
    pause: !selectedAccount,
  });

  const [totalClaimed, setTotalClaimed] = useState<BigNumber>(new BigNumber(0));

  const loadStakingCores = async (
    selectedAccount: InjectedAccountWithMeta | null
  ) => {
    setLoading(true);

    try {
      toast.loading("Loading staking cores...");

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
        era: results[2].toPrimitive() as number,
        erasPerYear:
          api.consts.checkedInflation.erasPerYear.toPrimitive() as number,
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
        const balanceInfo = await api.query.system.account(
          selectedAccount.address
        );

        const balance = balanceInfo.toPrimitive() as {
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

        setAvailableBalance(new BigNumber(balance.data.free));

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
      name: ModalName.MANAGE_STAKING,
      metadata: { ...core, totalStaked, availableBalance },
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
        (result) => {
          toast.dismiss();

          toast.loading("Submitting transaction...");

          if (result.status.isInvalid) {
            toast.dismiss();

            toast.error("Invalid transaction");
          } else if (result.status.isDropped) {
            toast.dismiss();

            toast.error("Transaction dropped");
          } else if (result.status.isFinalized) {
            toast.dismiss();

            toast.success("Successfully claimed all rewards!");
          }
        }
      );
  };

  useEffect(() => {
    loadStakingCores(selectedAccount);

    if (selectedAccount) {
      if (query.fetching) return;

      if (!query.data) return;

      const totalClaimedQuery: BigNumber = query.data.stakers.map(
        ({ totalRewards }: { totalRewards: BigNumber }) => totalRewards
      );

      setTotalClaimed(totalClaimedQuery);
    }
  }, [selectedAccount, query.fetching]);

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
                    // disabled={unclaimedEras.total === 0}
                  >
                    Claim All
                  </button>
                </div>
              </div>

              <div className="relative overflow-hidden rounded-md border border-neutral-50 bg-neutral-900 shadow sm:grid md:grid-cols-2 lg:grid-cols-4">
                <div className="flex flex-col gap-2 p-6">
                  <div>
                    <span className="text-sm">Total staked</span>
                  </div>
                  <div>
                    <span className="text-2xl font-bold">
                      {formatBalance(totalStaked.toString(), {
                        decimals: 12,
                        withUnit: false,
                        forceUnit: "-",
                      }).slice(0, -2)}{" "}
                      TNKR
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
                      }).slice(0, -2)}{" "}
                      TNKR
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-2 p-6">
                  <div>
                    <span className="text-sm">Current Era</span>
                  </div>
                  <div>
                    <span className="text-2xl font-bold">
                      {currentEra.inflationEra} / {currentEra.erasPerYear}
                    </span>
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
                  className="flex flex-col gap-4 overflow-hidden rounded-md border border-neutral-50 p-6 sm:flex-row"
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

                      <p className="text-sm">
                        {core.metadata.description}
                      </p>

                      {selectedAccount ? (
                        <div className="flex items-center justify-between gap-2">
                          <button
                            type="button"
                            className="inline-flex items-center justify-center rounded-md border border-amber-300 bg-amber-300 px-2 py-1 text-sm font-medium text-black shadow-sm hover:bg-amber-200 focus:outline-none focus:ring-2 focus:ring-neutral-500 focus:ring-offset-2"
                            onClick={() => {
                              handleManageStaking({
                                core,
                                totalStaked: totalStaked || new BigNumber("0"),
                                availableBalance:
                                  availableBalance?.minus(
                                    new BigNumber(10).pow(11)
                                  ) || new BigNumber("0"),
                              });
                            }}
                          >
                            {totalStaked ? "Manage Staking" : "Stake"}
                          </button>

                          <span className="block text-sm">
                            {totalStaked
                              ? `Staked ${formatBalance(
                                  totalStaked.toString(),
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
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="truncate text-sm">
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
                        TNKR staked
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
