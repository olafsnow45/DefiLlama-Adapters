const { request, gql } = require("graphql-request");
const { toUSDTBalances } = require('../helper/balances');
const sdk = require('@defillama/sdk')

function getChainTvl(graphUrls, factoriesName = "uniswapFactories", tvlName = "totalLiquidityUSD") {
    const graphQuery = gql`
query get_tvl($block: Int) {
  ${factoriesName}(
    block: { number: $block }
  ) {
    ${tvlName}
  }
}
`;
    return (chain) => {
        return async (timestamp, ethBlock, chainBlocks) => {
            let block;
            if (chain === "ethereum") {
                block = ethBlock;
            }
            block = chainBlocks[chain]
            if (block === undefined) {
                block = (await sdk.api.util.lookupBlock(timestamp, { chain })).block
            }
            const uniswapFactories = (await request(
                graphUrls[chain],
                graphQuery,
                {
                    block,
                }
            ))[factoriesName];
            const usdTvl = Number(uniswapFactories[0][tvlName])

            return toUSDTBalances(usdTvl)
        }
    }
}

function getAvaxUniswapTvl(graphUrl, factoriesName = "uniswapFactories", tvlName = "totalLiquidityETH") {
    const graphQuery = gql`
query get_tvl($block: Int) {
  ${factoriesName}(
    block: { number: $block }
  ) {
    ${tvlName}
  }
}
`;
    return async (timestamp, ethBlock, chainBlocks) => {
        const response = await request(
            graphUrl,
            graphQuery,
            {
              block:chainBlocks.avax,
            }
          );
        
          return {
            'avalanche-2': Number(response[factoriesName][0].totalLiquidityETH)
          }
    }
}

module.exports = {
    getChainTvl,
    getAvaxUniswapTvl
}