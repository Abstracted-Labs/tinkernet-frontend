const start = 2800000;
const period = 1;
const periodCount = 2629800;
const perPeriod = 68446200 / 1000000000000;  // Adjusted perPeriod
const currentBlock = 2931849; // Update this to your current block number

// Calculate the number of blocks that have passed since the start of the vesting
const blocksPassed = currentBlock - start;

// Calculate the number of tokens vested so far
const tokensVestedSoFar = blocksPassed * perPeriod;

// Calculate the total number of tokens to be vested
const totalTokensToBeVested = periodCount * perPeriod;

// The claimable vested tokens would be the smaller of the total tokens to be vested and the tokens vested so far
const claimableVestedTokens = Math.min(tokensVestedSoFar, totalTokensToBeVested);

console.log(claimableVestedTokens);