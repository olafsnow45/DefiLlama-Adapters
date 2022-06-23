const { request, gql } = require("graphql-request");
const sdk = require('@defillama/sdk');

const graphEndpoints = {
    'ethereum': "https://api.thegraph.com/subgraphs/name/dodoex/dodoex-v2",
    "bsc": "https://pq.hg.network/subgraphs/name/dodoex-v2-bsc/bsc"
}
const graphQuery = gql`
query get_pairs($block: Int, $lastId: String) {
    pairs(
      first: 1000,
      block: { number: $block },
      where: {id_gt: $lastId}
    ) {
        id
        baseReserve
        quoteReserve
        baseToken{
          id
          symbol
          usdPrice
        }
        quoteToken{
          id
          symbol
          usdPrice
        }
    }
}
`

async function getChainTvl(chain, block, transformAddr) {
    let allPairs = []
    let lastId = ""
    let response;
    do {
        response = await request(
            graphEndpoints[chain],
            graphQuery,
            {
                block,
                lastId
            }
        );
        allPairs = allPairs.concat(response.pairs)
        lastId = response.pairs[response.pairs.length-1].id
    } while (response.pairs.length >= 1000);

    const balanceCalls = allPairs.map(pair => {
        if (pair.id.includes('-')) {
            return null
        }
        return [{
            target: pair.quoteToken.id,
            params: [pair.id]
        }, {
            target: pair.baseToken.id,
            params: [pair.id]
        }]
    }).filter(pair => pair !== null).flat()

    const balanceResults = await sdk.api.abi.multiCall({
        abi: 'erc20:balanceOf',
        calls: balanceCalls,
        block,
        chain
    })
    const balances = {}
    sdk.util.sumMultiBalanceOf(balances, balanceResults, transformAddr)

    return balances
}

function bsc(timestamp, ethBlock, chainBlocks){
    return getChainTvl('bsc', chainBlocks['bsc'], addr=>`bsc:${addr}`)
}

function eth(timestamp, ethBlock, chainBlocks){
    return getChainTvl('ethereum', ethBlock, addr=>addr)
}

module.exports = {
    ethereum: {
        tvl:eth,
    },
    bsc:{
        tvl: bsc
    },
    tvl: sdk.util.sumChainTvls([eth, bsc])
}
