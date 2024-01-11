const { hexToString } = require("@polkadot/util");

const gqlHost = () => 'https://basilisk-explorer.play.hydration.cloud/graphql';

exports.isApiRoute = function (path) {
  return path.startsWith('/api');
};

exports.gqlQuery = async function (data) {
  return JSON.stringify(
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
};

exports.getAssetsData = async function () {
  const queryData = {
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
  const response = await exports.gqlQuery(queryData);
  const events = JSON.parse(response)[ "data" ][ "events" ];
  const assets = events.map((event) => {
    const args = event.args;
    return args.symbol && typeof args.assetId == "number"
      ? { symbol: hexToString(args.symbol.toString()), assetId: args.assetId }
      : { symbol: hexToString(args[ 1 ].toString()), assetId: args[ 0 ] };
  });

  return assets;
};