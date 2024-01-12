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
      query AssetsData { 
        events(where: {name_eq: "AssetRegistry.MetadataSet"}, limit: 100) { 
          name 
          args 
        } 
      }`,
    variables: null,
    operationName: "AssetsData",
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

exports.getTnkrData = async function () {
  const queryTnkrSellData = {
    query: `
      query TnkrSell {
        events(where: {name_eq: "XYK.SellExecuted"}, limit: 5000) {
          name
          args
          block {
            id
          }
        }
      }
    `,
    variables: null,
    operationName: "TnkrSell",
  };
  const queryTnkrBuyData = {
    query: `
      query TnkrBuy {
        events(where: {name_eq: "XYK.BuyExecuted"}, limit: 5000) {
          name
          args
          block {
            id
          }
        }
      }
    `,
    variables: null,
    operationName: "TnkrBuy",
  };
  const sellResponse = await exports.gqlQuery(queryTnkrSellData);
  const buyResponse = await exports.gqlQuery(queryTnkrBuyData);
  const sellEvents = JSON.parse(sellResponse)[ "data" ][ "events" ];
  const buyEvents = JSON.parse(buyResponse)[ "data" ][ "events" ];
  const concatEvents = sellEvents.concat(buyEvents);
  return concatEvents.filter((event) => event && event.args && (event.args.assetOut && event.args.assetOut === 6) || (event.args.assetIn && event.args.assetIn === 6)).map((event) => {
    const args = event.args;
    const blocks = event.block;
    if (!blocks || !args) return;
    if (args.name === "XYK.SellExecuted") {
      return {
        blockId: blocks.id,
        assetOut: args.assetOut,
        assetIn: args.assetIn,
        amountOut: args.amount,
        amountIn: args.salePrice,
      };
    } else {
      return {
        blockId: blocks.id,
        assetOut: args.assetOut,
        assetIn: args.assetIn,
        amountOut: args.amount,
        amountIn: args.buyPrice,
      };
    }
  });
};