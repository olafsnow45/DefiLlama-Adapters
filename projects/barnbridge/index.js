/*==================================================
  Imports
==================================================*/
const sdk = require('@defillama/sdk');
const BigNumber = require('bignumber.js');

/*==================================================
  Settings
==================================================*/
const listedTokens = [
    // Compound - USDC
    {
        isCompound: true,
        provider: '0x39aa39c021dfbae8fac545936693ac917d5e7563',
        cToken: {
            address: '0xDAA037F99d168b552c0c61B7Fb64cF7819D78310',
            decimals: 8,
        },
        uToken: {
            address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
            decimals: 6,
        },
    },
    // Compound - DAI
    {
        isCompound: true,
        provider: '0x5d3a536e4d6dbd6114cc1ead35777bab948e3643',
        cToken: {
            address: '0xe6c1a8e7a879d7febb8144276a62f9a6b381bd37',
            decimals: 8,
        },
        uToken: {
            address: '0x6b175474e89094c44da98b954eedeac495271d0f',
            decimals: 18,
        },
    },
];

/*==================================================
  Helpers
==================================================*/
function createAbiViewItemFor(name, inputs, outputs) {
    return {
        name,
        type: 'function',
        stateMutability: 'view',
        inputs: inputs.map(input => ({
            name: '',
            type: input,
        })),
        outputs: outputs.map(output => ({
            name: '',
            type: output,
        })),
    };
}

function getCompoundBalanceFor(providerAddress, cTokenAddress, cTokenDecimals, block) {
    const abi = createAbiViewItemFor('balanceOf', ['address'], ['uint256']);

    return sdk.api.abi.call({
        abi,
        target: providerAddress,
        params: [cTokenAddress],
        block,
    }).then(({output}) => new BigNumber(output).dividedBy(10 ** cTokenDecimals));
}

function getCompoundExchangeRateFor(providerAddress, cTokenDecimals, uTokenDecimals, block) {
    const abi = createAbiViewItemFor('exchangeRateStored', [], ['uint256']);
    const decimals = 18 + uTokenDecimals - cTokenDecimals;

    return sdk.api.abi.call({
        abi,
        target: providerAddress,
        block,
    }).then(({output}) => new BigNumber(output).dividedBy(10 ** decimals));
}

/*==================================================
  Main
==================================================*/
async function tvl(timestamp, block) {
    const balances = {};

    await Promise.all(listedTokens.map(async token => {
        const {provider, cToken, uToken} = token;

        if (!balances[uToken.address]) {
            balances[uToken.address] = new BigNumber(0);
        }

        let balance;
        let exchangeRate;

        try {
            if (token.isCompound) {
                balance = await getCompoundBalanceFor(provider, cToken.address, cToken.decimals, block);
                exchangeRate = await getCompoundExchangeRateFor(provider, cToken.decimals, uToken.decimals, block);
            }

            const totalValue = balance
                .multipliedBy(exchangeRate)
                .multipliedBy(10 ** uToken.decimals)
                .integerValue(BigNumber.ROUND_UP);

            balances[uToken.address] = balances[uToken.address].plus(totalValue);
        } catch (e) {
            console.log('ERROR', e);
        }
    }));

    return balances;
}

/*==================================================
  Metadata
==================================================*/
module.exports = {
    name: 'BarnBridge',
    website: 'https://app.barnbridge.com',
    token: 'BOND',
    category: 'derivatives',
    start: 1615564559, // Mar-24-2021 02:17:40 PM +UTC
    tvl,
};