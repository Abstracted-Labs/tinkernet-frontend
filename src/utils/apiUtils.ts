import { hexToString } from "@polkadot/util";

const gqlHost = (): string => 'https://basilisk-explorer.play.hydration.cloud/graphql'; // Replace with your actual GraphQL host

interface QueryData {
  query: string;
  variables: null;
  operationName: string;
}

interface Asset {
  symbol: string;
  assetId: number;
}

interface Event {
  args: {
    symbol?: string;
    assetId?: number;
    [key: number]: string | number; // for args[0] and args[1]
  };
}

export function isApiRoute(path: string) {
  return path.startsWith('/api');
}

export const gqlQuery = async (data: QueryData): Promise<string> =>
  JSON.stringify(
    await (
      await fetch(gqlHost(), {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      })
    ).json()
  );

export const getAssetsData = async (): Promise<Asset[]> => {
  const queryData: QueryData = {
    query: `
      query TnkrQuery { 
        events(where: {name_eq: "AssetRegistry.MetadataSet"}, limit: 100) { 
          name 
          args 
        } 
      }`,
    variables: null,
    operationName: "TnkrQuery",
  };
  const response = await gqlQuery(queryData);
  const events = JSON.parse(response)["data"]["events"];
  const assets: Asset[] = events.map((event: unknown) => {
    const args = (event as Event).args;
    return args.symbol && typeof args.assetId == "number"
      ? { symbol: hexToString(args.symbol.toString()), assetId: args.assetId }
      : { symbol: hexToString(args[1].toString()), assetId: args[0] };
  });

  return assets;
};