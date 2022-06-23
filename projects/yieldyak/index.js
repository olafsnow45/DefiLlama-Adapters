const sdk = require('@defillama/sdk');
const { unwrapUniswapLPs } = require('../helper/unwrapLPs')
const abi = require('./abi.json')
const { request, gql } = require("graphql-request");
const { transformAvaxAddress, fixAvaxBalances } = require('../helper/portedTokens');
const { default: BigNumber } = require('bignumber.js');

const graphUrl = 'https://api.thegraph.com/subgraphs/name/yieldyak/reinvest-tracker'
const graphQuery = gql`
query get_tvl($block: Int) {
    farms(first: 1000) {
        id
        name
        depositToken {
          id
        }
        depositTokenBalance
    }
}
`;

async function tvl(timestamp, ethBlock, chainBlocks) {
    const block = chainBlocks.avax;
    const farms = (await request(graphUrl, graphQuery, { block })).farms
    const transformAddress = await transformAvaxAddress()
    const calls = {
        calls: farms.map(f => ({
            target: f.id
        })),
        block,
        chain: 'avax'
    }
    const [tokenAmounts, tokens] = await Promise.all([
        sdk.api.abi.multiCall({
            ...calls,
            abi: abi.totalDeposits,
        }),
        sdk.api.abi.multiCall({
            ...calls,
            abi: abi.depositToken,
        })
    ])
    tokens.output.forEach((token, idx) => {
        if (token.output === null) {
            token.output = farms[idx].depositToken.id
        }
    })
    const balances = {}
    const lps = []
    await Promise.all(farms.map(async (farm, idx)=>{
        let token = tokens.output[idx].output
        let balance = tokenAmounts.output[idx].output
        if (farm.name.startsWith("Snowball: sPGL ")) {
            const [underlyingToken, ratio] = await Promise.all([abi.token, abi.getRatio].map(abi =>
                sdk.api.abi.call({
                    target: token,
                    block,
                    chain: 'avax',
                    abi
                })
            ));
            token = underlyingToken.output;
            balance = BigNumber(balance).times(ratio.output).div(1e18).toFixed(0)
        }
        if (farm.name.includes('-') && !farm.name.startsWith('Yield Yak: Gondola ')) {
            lps.push({
                token,
                balance,
            })
        } else {
            sdk.util.sumSingleBalance(balances, transformAddress(token), balance)
        }
    }))

    await unwrapUniswapLPs(balances, lps, block, 'avax', transformAddress)
    //await addTokensAndLPs(balances, tokens, tokenAmounts, block, 'avax', transformAddress)
    fixAvaxBalances(balances)
    return balances
}

module.exports = {
    tvl
}